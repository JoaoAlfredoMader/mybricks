import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, makeContract, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

type User = ReturnType<typeof userEvent.setup>

async function pick(user: User, field: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: field }))
  await user.click(await screen.findByRole('option', { name: option }))
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
}

// Filling a long form through the UI takes a few seconds when the whole suite runs at once.
describe('New contract', { timeout: 20_000 }, () => {
  it('creates a contract with a new tenant and opens it', async () => {
    const user = userEvent.setup()
    const centro = makePropertyRecord()
    const api = fakeApi({ session: makeSession(), properties: [centro] })
    const { router } = renderRoute(`/app/contratos/novo?propertyId=${centro.id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Novo contrato' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Imóvel' })).toHaveTextContent('Apartamento Centro')

    await user.click(screen.getByRole('button', { name: 'Cadastrar contrato' }))
    expect(await screen.findByText('Informe o nome (pelo menos 2 letras).')).toBeInTheDocument()
    expect(screen.getByText('Informe o início.')).toBeInTheDocument()
    expect(screen.getByText('Informe o aluguel mensal.')).toBeInTheDocument()
    expect(api.calls.some((call) => call.method === 'POST')).toBe(false)

    await user.type(screen.getByLabelText('Nome'), 'Rafael Lima')
    await user.type(screen.getByLabelText('CPF ou CNPJ'), '390.533.447-05')
    await user.type(screen.getByLabelText('Telefone'), '(11) 98765-4321')
    await user.type(screen.getByLabelText('Início'), '01122026')
    await user.type(screen.getByLabelText('Fim'), '30112026')
    await user.type(screen.getByLabelText('Aluguel mensal'), '1.350,00')
    await user.type(screen.getByLabelText('Dia do vencimento'), '10')
    await pick(user, 'Índice de reajuste', 'IPCA')
    await user.click(screen.getByRole('button', { name: 'Cadastrar contrato' }))
    expect(await screen.findByText('O fim precisa ser depois do início.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Fim'))
    await user.type(screen.getByLabelText('Fim'), '30112027')
    await user.click(screen.getByRole('button', { name: 'Cadastrar contrato' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Rafael Lima' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/app\/contratos\/[\w-]+$/)
    expect(api.calls.find((call) => call.method === 'POST')?.body).toEqual({
      propertyId: centro.id,
      contractType: 'conventional',
      startDate: '2026-12-01',
      endDate: '2027-11-30',
      notes: null,
      occupant: { name: 'Rafael Lima', document: '39053344705', email: null, phone: '11987654321' },
      rentTerms: { monthlyRentCents: 135_000, dueDay: 10, adjustmentIndex: 'ipca' },
    })
  })

  it('warns that the active contract will end, and reuses a tenant on file', async () => {
    const user = userEvent.setup()
    const centro = makePropertyRecord()
    const current = makeContract({ propertyId: centro.id, occupant: { id: 'o-1', name: 'Pedro Almeida', document: null, email: null, phone: null } })
    const api = fakeApi({
      session: makeSession(),
      properties: [centro],
      contracts: [current],
      occupants: [
        { id: 'o-1', name: 'Pedro Almeida', document: null, email: 'pedro@example.com', phone: null },
        { id: 'o-2', name: 'Marina Prado', document: '12345678000195', email: null, phone: null },
      ],
    })
    renderRoute('/app/contratos/novo')

    await screen.findByRole('heading', { level: 1, name: 'Novo contrato' })
    await pick(user, 'Imóvel', 'Apartamento Centro')
    expect(await screen.findByText(/já tem um contrato ativo com Pedro Almeida, desde 08\/01\/2026/)).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Já cadastrado' }))
    await user.type(screen.getByRole('combobox', { name: 'Ocupante' }), 'Mar')
    const option = await screen.findByRole('option', { name: /Marina Prado/ })
    expect(option).toHaveTextContent('12.345.678/0001-95')
    await user.click(option)
    await user.type(screen.getByLabelText('Início'), '01122026')
    await user.type(screen.getByLabelText('Aluguel mensal'), '2.000')
    await user.type(screen.getByLabelText('Dia do vencimento'), '5')
    await user.click(screen.getByRole('button', { name: 'Cadastrar contrato' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Marina Prado' })).toBeInTheDocument()
    expect(api.calls.find((call) => call.method === 'POST')?.body).toMatchObject({ occupantId: 'o-2', endDate: null })
    expect(current.status).toBe('ended')
  })

  it('asks no rent for a short-stay property and explains the API refusals', async () => {
    const user = userEvent.setup()
    const flat = makePropertyRecord({ name: 'Flat Beira-Mar', usageType: 'short_stay', rentalMode: 'manual' })
    const casa = makePropertyRecord({ name: 'Casa de Praia', usageType: 'own_use' })
    fakeApi({ session: makeSession(), properties: [flat, casa] })
    renderRoute('/app/contratos/novo')

    await user.click(await screen.findByRole('combobox', { name: 'Imóvel' }))
    const flatOption = await screen.findByRole('option', { name: 'Flat Beira-Mar' })
    expect(screen.queryByRole('option', { name: 'Casa de Praia' })).not.toBeInTheDocument()
    await user.click(flatOption)

    expect(await screen.findByText(/a receita vem das reservas/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Aluguel mensal')).not.toBeInTheDocument()
    expect(screen.getByText(/Para ele ter contratos, edite o imóvel/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nome'), 'Temporada Santos')
    await user.type(screen.getByLabelText('Início'), '01122026')
    await user.click(screen.getByRole('button', { name: 'Cadastrar contrato' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Edite-o e escolha "Do contrato ativo"')
  })
})

describe('Editing a contract', { timeout: 20_000 }, () => {
  it('changes the rent and makes it open-ended', async () => {
    const user = userEvent.setup()
    const contract = makeContract()
    const api = fakeApi({ session: makeSession(), contracts: [contract] })
    renderRoute(`/app/contratos/${contract.id}/editar`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Editar contrato de Ana Carolina Souza' })).toBeInTheDocument()
    expect(screen.getByLabelText('Aluguel mensal')).toHaveValue('3.800,00')
    expect(screen.getByLabelText('Fim')).toHaveValue('07/01/2028')

    await user.clear(screen.getByLabelText('Aluguel mensal'))
    await user.type(screen.getByLabelText('Aluguel mensal'), '3.950,00')
    await user.clear(screen.getByLabelText('Fim'))
    await pick(user, 'Índice de reajuste', 'Sem índice')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Carolina Souza' })).toBeInTheDocument()
    expect(api.calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      endDate: null,
      notes: null,
      rentTerms: { monthlyRentCents: 395_000, dueDay: 5, adjustmentIndex: null },
    })
    expect(within(screen.getByRole('region', { name: 'Vigência' })).getByText('Prazo indeterminado')).toBeInTheDocument()
  })

  it('sends a contract that is no longer active back to its page', async () => {
    const contract = makeContract({ status: 'ended' })
    fakeApi({ session: makeSession(), contracts: [contract] })
    const { router } = renderRoute(`/app/contratos/${contract.id}/editar`)

    expect(await screen.findByText(/Este contrato foi encerrado/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/app/contratos/${contract.id}`)
  })
})
