import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, makeContract, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

// Intl separates the currency sign with a no-break space.
const plain = (value: string | null | undefined) => value?.replace(/ /g, ' ')

function rows() {
  return within(screen.getByRole('region', { name: 'Lista de contratos' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => plain(cell.textContent)).join(' | '))
}

/** The label/value pairs of one detail card. */
function card(title: string) {
  const section = screen.getByRole('region', { name: title })
  const labels = within(section).getAllByRole('term').map((term) => term.textContent)
  const values = within(section).getAllByRole('definition').map((value) => plain(value.textContent))
  return Object.fromEntries(labels.map((label, i) => [label, values[i]]))
}

describe('Contract list', { timeout: 20_000 }, () => {
  it('lists the contracts, newest start first, and filters them in the URL', async () => {
    const user = userEvent.setup()
    const centro = makePropertyRecord()
    fakeApi({
      session: makeSession(),
      properties: [centro],
      contracts: [
        makeContract({ propertyId: centro.id, status: 'ended', startDate: '2024-12-04', endDate: '2026-01-07', occupant: { id: 'o-1', name: 'Pedro Almeida', document: null, email: null, phone: null }, rentTerms: { monthlyRentCents: 350_000, dueDay: 10, adjustmentIndex: null } }),
        makeContract({ propertyId: centro.id }),
        makeContract({ propertyName: 'Flat Beira-Mar', contractType: 'short_stay', startDate: '2025-09-30', endDate: null, rentTerms: null, occupant: { id: 'o-2', name: 'Temporada Santos', document: null, email: null, phone: null } }),
      ],
    })
    const { router } = renderRoute('/app/contratos')

    expect(await screen.findByRole('heading', { level: 1, name: 'Contratos' })).toBeInTheDocument()
    expect(rows()).toEqual([
      'Ana Carolina Souza | Apartamento Centro | Locação | 08/01/2026 a 07/01/2028 | R$ 3.800,00 | Ativo',
      'Temporada Santos | Flat Beira-Mar | Temporada | Desde 30/09/2025 | — | Ativo',
      'Pedro Almeida | Apartamento Centro | Locação | 04/12/2024 a 07/01/2026 | R$ 3.500,00 | Encerrado',
    ])
    expect(screen.getByRole('link', { name: 'Contratos' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('combobox', { name: 'Situação' }))
    await user.click(await screen.findByRole('option', { name: 'Encerrados' }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(router.state.location.search).toEqual({ status: 'ended' })
  })

  it('shows the contracts of one property when opened from it', async () => {
    const user = userEvent.setup()
    const centro = makePropertyRecord()
    fakeApi({
      session: makeSession(),
      properties: [centro],
      contracts: [makeContract({ propertyId: centro.id }), makeContract({ propertyName: 'Flat Beira-Mar' })],
    })
    const { router } = renderRoute(`/app/contratos?propertyId=${centro.id}`)

    expect(await screen.findByText('Apartamento Centro', { selector: 'span' })).toBeInTheDocument()
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Novo contrato' })).toHaveAttribute('href', `/app/contratos/novo?propertyId=${centro.id}`)

    await user.click(screen.getByRole('button', { name: 'Ver contratos de todos os imóveis' }))
    await waitFor(() => expect(rows()).toHaveLength(2))
    expect(router.state.location.search).toEqual({})
  })

  it('offers to clear the filters when nothing matches them', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), contracts: [makeContract()] })
    const { router } = renderRoute('/app/contratos?status=ended')

    expect(await screen.findByText('Nenhum contrato encontrado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(router.state.location.search).toEqual({})
  })

  it('pages through twenty at a time', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), contracts: Array.from({ length: 21 }, () => makeContract()) })
    const { router } = renderRoute('/app/contratos')

    expect(await screen.findByText('1–20 de 21')).toBeInTheDocument()
    expect(rows()).toHaveLength(20)
    await user.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(await screen.findByText('21–21 de 21')).toBeInTheDocument()
    expect(rows()).toHaveLength(1)
    expect(router.state.location.search).toEqual({ page: 2 })

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    await waitFor(() => expect(rows()).toHaveLength(20))
    expect(router.state.location.search).toEqual({})
  })
})

describe('Contract page', { timeout: 20_000 }, () => {
  it('shows the occupant, the term and the rent', async () => {
    const contract = makeContract({ notes: 'Vence em breve.' })
    fakeApi({ session: makeSession(), contracts: [contract] })
    renderRoute(`/app/contratos/${contract.id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Carolina Souza' })).toBeInTheDocument()
    expect(screen.getByText('Contrato de locação')).toBeInTheDocument()
    expect(card('Ocupante')).toEqual({
      Nome: 'Ana Carolina Souza',
      'CPF ou CNPJ': '390.533.447-05',
      'E-mail': 'ana@example.com',
      Telefone: '(11) 96543-2109',
    })
    expect(card('Vigência')).toEqual({ Início: '8 de janeiro de 2026', Fim: '7 de janeiro de 2028' })
    expect(card('Aluguel')).toEqual({ 'Aluguel mensal': 'R$ 3.800,00', Vencimento: 'Dia 5', Reajuste: 'IGP-M' })
    expect(screen.getByRole('region', { name: 'Observações' })).toHaveTextContent('Vence em breve.')
  })

  it('generates the PDF and then offers it for download', async () => {
    const user = userEvent.setup()
    const contract = makeContract()
    const api = fakeApi({ session: makeSession(), contracts: [contract] })
    renderRoute(`/app/contratos/${contract.id}`)

    await user.click(await screen.findByRole('button', { name: 'Gerar PDF' }))
    expect(await screen.findByRole('link', { name: 'Baixar PDF' })).toHaveAttribute('href', `/api/contracts/${contract.id}/pdf`)
    expect(screen.getByRole('button', { name: 'Gerar de novo' })).toBeInTheDocument()
    expect(api.calls.filter((call) => call.method === 'POST' && call.path.endsWith('/pdf'))).toHaveLength(1)
  })

  it('ends the contract on the day chosen, after checking it', async () => {
    const user = userEvent.setup()
    const contract = makeContract({ startDate: '2026-01-08' })
    const api = fakeApi({ session: makeSession(), contracts: [contract] })
    renderRoute(`/app/contratos/${contract.id}`)

    await user.click(await screen.findByRole('button', { name: 'Encerrar' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Encerrar o contrato?' })
    const date = within(dialog).getByLabelText('Último dia do contrato')
    await user.clear(date)
    await user.type(date, '01012026')
    await user.click(within(dialog).getByRole('button', { name: 'Encerrar contrato' }))
    expect(within(dialog).getByText('O fim precisa ser depois do início (08/01/2026).')).toBeInTheDocument()

    await user.clear(date)
    await user.type(date, '31032026')
    await user.click(within(dialog).getByRole('button', { name: 'Encerrar contrato' }))

    expect(await screen.findByText(/Este contrato foi encerrado/)).toBeInTheDocument()
    expect(api.calls.find((call) => call.path.endsWith('/end'))?.body).toEqual({ endDate: '2026-03-31' })
    expect(screen.queryByRole('button', { name: 'Encerrar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(card('Vigência')).toMatchObject({ Fim: '31 de março de 2026' })
  })

  it('cancels the contract after confirming', async () => {
    const user = userEvent.setup()
    const contract = makeContract()
    fakeApi({ session: makeSession(), contracts: [contract] })
    renderRoute(`/app/contratos/${contract.id}`)

    await user.click(await screen.findByRole('button', { name: 'Cancelar contrato' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Cancelar este contrato?' })
    await user.click(within(dialog).getByRole('button', { name: 'Voltar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar contrato' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar contrato' }))
    expect(await screen.findByText(/Este contrato foi cancelado/)).toBeInTheDocument()
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })

  it('has no rent and no PDF for a short-stay contract', async () => {
    const contract = makeContract({ contractType: 'short_stay', rentTerms: null })
    fakeApi({ session: makeSession(), contracts: [contract] })
    renderRoute(`/app/contratos/${contract.id}`)

    expect(await screen.findByText('Contrato de temporada')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Aluguel' })).toHaveTextContent('a receita vem das reservas')
    expect(screen.queryByRole('region', { name: 'Documento' })).not.toBeInTheDocument()
  })

  it('says so when the contract is not in this portfolio', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app/contratos/00000000-0000-4000-9000-999999999999')

    expect(await screen.findByRole('heading', { level: 1, name: 'Contrato não encontrado' })).toBeInTheDocument()
  })
})
