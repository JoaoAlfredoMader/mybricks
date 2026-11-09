import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, makeContract, makePropertyRecord, makeReservation, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

// Intl separates the currency sign with a no-break space.
const plain = (value: string | null | undefined) => value?.replace(/ /g, ' ')

const flat = () => makePropertyRecord({ name: 'Flat Beira-Mar', usageType: 'short_stay', status: 'rented' })

function rows() {
  return within(screen.getByRole('region', { name: 'Lista de reservas' }))
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

describe('Reservation list', { timeout: 20_000 }, () => {
  it('lists the stays, latest check-in first, and filters them in the URL', async () => {
    const user = userEvent.setup()
    const beira = flat()
    const outro = makePropertyRecord({ name: 'Chalé da Serra', usageType: 'short_stay' })
    fakeApi({
      session: makeSession(),
      properties: [beira, outro],
      reservations: [
        makeReservation({ propertyId: beira.id, checkIn: '2026-10-10', checkOut: '2026-10-15', nights: 5, totalAmountCents: 225_000, guest: { id: 'g-1', name: 'Marcos Vieira', document: null, email: null, phone: null } }),
        makeReservation({ propertyId: beira.id }),
        makeReservation({ propertyId: outro.id, propertyName: 'Chalé da Serra', status: 'cancelled', checkIn: '2026-10-25', checkOut: '2026-10-28', nights: 3, totalAmountCents: 120_000, guest: { id: 'g-2', name: 'Roberto Lima', document: null, email: null, phone: null } }),
      ],
    })
    const { router } = renderRoute('/app/reservas')

    expect(await screen.findByRole('heading', { level: 1, name: 'Reservas' })).toBeInTheDocument()
    expect(rows()).toEqual([
      'Carla Mendes | Flat Beira-Mar | 22/11/2026 a 27/11/2026 | 5 | R$ 3.300,00 | Confirmada',
      'Roberto Lima | Chalé da Serra | 25/10/2026 a 28/10/2026 | 3 | R$ 1.200,00 | Cancelada',
      'Marcos Vieira | Flat Beira-Mar | 10/10/2026 a 15/10/2026 | 5 | R$ 2.250,00 | Confirmada',
    ])
    expect(screen.getByRole('link', { name: 'Reservas' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('combobox', { name: 'Situação' }))
    await user.click(await screen.findByRole('option', { name: 'Canceladas' }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(router.state.location.search).toEqual({ status: 'cancelled' })

    await user.click(screen.getByRole('combobox', { name: 'Situação' }))
    await user.click(await screen.findByRole('option', { name: 'Todas as situações' }))
    await user.click(screen.getByRole('combobox', { name: 'Imóvel' }))
    await user.click(await screen.findByRole('option', { name: 'Flat Beira-Mar' }))
    await waitFor(() => expect(rows()).toHaveLength(2))
    expect(router.state.location.search).toEqual({ propertyId: beira.id })
  })

  it('says so when there is nothing to list', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app/reservas')

    expect(await screen.findByText('Nenhuma reserva cadastrada ainda')).toBeInTheDocument()
  })

  it('offers to clear the filters when nothing matches them', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), reservations: [makeReservation()] })
    const { router } = renderRoute('/app/reservas?status=cancelled')

    expect(await screen.findByText('Nenhuma reserva encontrada')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(router.state.location.search).toEqual({})
  })

  it('pages through twenty at a time', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), reservations: Array.from({ length: 21 }, () => makeReservation()) })
    const { router } = renderRoute('/app/reservas')

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

describe('Reservation page', { timeout: 20_000 }, () => {
  it('shows the guest, the stay and the linked contract', async () => {
    const beira = flat()
    const contract = makeContract({ propertyId: beira.id, contractType: 'short_stay', rentTerms: null })
    const reservation = makeReservation({ propertyId: beira.id, contractId: contract.id, notes: 'Chega à noite.' })
    fakeApi({ session: makeSession(), properties: [beira], contracts: [contract], reservations: [reservation] })
    renderRoute(`/app/reservas/${reservation.id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Carla Mendes' })).toBeInTheDocument()
    expect(screen.getByText('Reserva de temporada')).toBeInTheDocument()
    expect(card('Hóspede')).toEqual({ Nome: 'Carla Mendes', 'CPF ou CNPJ': '—', 'E-mail': 'carla@example.com', Telefone: '(11) 98765-4321' })
    expect(await screen.findByRole('link', { name: 'Ana Carolina Souza · 08/01/2026 a 07/01/2028' })).toHaveAttribute(
      'href',
      `/app/contratos/${contract.id}`,
    )
    expect(card('Estadia')).toMatchObject({
      Entrada: '22 de novembro de 2026',
      Saída: '27 de novembro de 2026',
      Noites: '5 noites',
      'Valor total': 'R$ 3.300,00',
    })
    expect(screen.getByRole('region', { name: 'Observações' })).toHaveTextContent('Chega à noite.')
  })

  it('cancels the reservation after confirming, and then offers no changes', async () => {
    const user = userEvent.setup()
    const reservation = makeReservation()
    fakeApi({ session: makeSession(), reservations: [reservation] })
    renderRoute(`/app/reservas/${reservation.id}`)

    await user.click(await screen.findByRole('button', { name: 'Cancelar reserva' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Cancelar esta reserva?' })
    await user.click(within(dialog).getByRole('button', { name: 'Voltar' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar reserva' }))

    expect(await screen.findByText(/Esta reserva foi cancelada/)).toBeInTheDocument()
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument()
  })

  it('says so when the reservation is not in this portfolio', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app/reservas/00000000-0000-4000-a000-999999999999')

    expect(await screen.findByRole('heading', { level: 1, name: 'Reserva não encontrada' })).toBeInTheDocument()
  })
})
