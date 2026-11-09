import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, makeContract, makePropertyRecord, makeReservation, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

type User = ReturnType<typeof userEvent.setup>

async function pick(user: User, field: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: field }))
  await user.click(await screen.findByRole('option', { name: option }))
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
}

const flat = () => makePropertyRecord({ name: 'Flat Beira-Mar', usageType: 'short_stay', rentalMode: 'contract' })

// Filling a long form through the UI takes a few seconds when the whole suite runs at once.
describe('New reservation', { timeout: 20_000 }, () => {
  it('books a stay on the last day of another, and links the short-stay contract', async () => {
    const user = userEvent.setup()
    const beira = flat()
    const contract = makeContract({
      propertyId: beira.id,
      contractType: 'short_stay',
      rentTerms: null,
      startDate: '2025-09-30',
      endDate: null,
      occupant: { id: 'o-1', name: 'Temporada Santos', document: null, email: null, phone: null },
    })
    const api = fakeApi({
      session: makeSession(),
      properties: [beira],
      contracts: [contract],
      reservations: [makeReservation({ propertyId: beira.id, checkIn: '2026-11-22', checkOut: '2026-11-27' })],
    })
    const { router } = renderRoute(`/app/reservas/nova?propertyId=${beira.id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Nova reserva' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Imóvel' })).toHaveTextContent('Flat Beira-Mar')

    await user.click(screen.getByRole('button', { name: 'Cadastrar reserva' }))
    expect(await screen.findByText('Informe o nome (pelo menos 2 letras).')).toBeInTheDocument()
    expect(screen.getByText('Informe a entrada.')).toBeInTheDocument()
    expect(screen.getByText('Informe a saída.')).toBeInTheDocument()
    expect(api.calls.some((call) => call.method === 'POST')).toBe(false)

    await user.type(screen.getByLabelText('Nome'), 'Hóspede Teste')
    await user.type(screen.getByLabelText('Entrada'), '24112026')
    await user.type(screen.getByLabelText('Saída'), '23112026')
    await user.type(screen.getByLabelText('Valor total'), '1.800,00')
    await user.click(screen.getByRole('button', { name: 'Cadastrar reserva' }))
    expect(await screen.findByText('A saída precisa ser depois da entrada.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Entrada'))
    await user.type(screen.getByLabelText('Entrada'), '20112026')
    await user.clear(screen.getByLabelText('Saída'))
    await user.type(screen.getByLabelText('Saída'), '24112026')
    await pick(user, 'Contrato de temporada', 'Temporada Santos · Desde 30/09/2025')
    await user.click(screen.getByRole('button', { name: 'Cadastrar reserva' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('já tem uma reserva confirmada de 22/11/2026 a 27/11/2026')

    await user.clear(screen.getByLabelText('Saída'))
    await user.type(screen.getByLabelText('Saída'), '22112026')
    await user.click(screen.getByRole('button', { name: 'Cadastrar reserva' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Hóspede Teste' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/app\/reservas\/[\w-]+$/)
    expect(api.calls.filter((call) => call.method === 'POST').at(-1)?.body).toEqual({
      propertyId: beira.id,
      checkIn: '2026-11-20',
      checkOut: '2026-11-22',
      totalAmountCents: 180_000,
      contractId: contract.id,
      notes: null,
      occupant: { name: 'Hóspede Teste', document: null, email: null, phone: null },
    })
  })

  it('reuses a guest on file and sends a blank total as zero', async () => {
    const user = userEvent.setup()
    const beira = flat()
    const api = fakeApi({
      session: makeSession(),
      properties: [beira],
      occupants: [{ id: 'o-2', name: 'Marina Prado', document: null, email: 'marina@example.com', phone: null }],
    })
    renderRoute('/app/reservas/nova')

    await screen.findByRole('heading', { level: 1, name: 'Nova reserva' })
    await pick(user, 'Imóvel', 'Flat Beira-Mar')
    await user.click(screen.getByRole('radio', { name: 'Já cadastrado' }))
    await user.type(screen.getByRole('combobox', { name: 'Hóspede' }), 'Mar')
    await user.click(await screen.findByRole('option', { name: /Marina Prado/ }))
    await user.type(screen.getByLabelText('Entrada'), '01122026')
    await user.type(screen.getByLabelText('Saída'), '05122026')
    await user.click(screen.getByRole('button', { name: 'Cadastrar reserva' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Marina Prado' })).toBeInTheDocument()
    expect(api.calls.find((call) => call.method === 'POST')?.body).toMatchObject({ occupantId: 'o-2', totalAmountCents: 0, contractId: null })
  })

  it('offers only short-stay properties, and explains when there are none', async () => {
    fakeApi({ session: makeSession(), properties: [makePropertyRecord({ name: 'Apartamento Centro' })] })
    renderRoute('/app/reservas/nova')

    expect(await screen.findByText(/Nenhum imóvel de temporada ainda/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cadastre um imóvel' })).toHaveAttribute('href', '/app/imoveis/novo')
    expect(screen.queryByRole('combobox', { name: 'Imóvel' })).not.toBeInTheDocument()
  })
})

describe('Editing a reservation', { timeout: 20_000 }, () => {
  it('sends the total and the notes, and the dates only when they changed', async () => {
    const user = userEvent.setup()
    const beira = flat()
    const reservation = makeReservation({ propertyId: beira.id })
    const api = fakeApi({ session: makeSession(), properties: [beira], reservations: [reservation] })
    renderRoute(`/app/reservas/${reservation.id}/editar`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Editar reserva de Carla Mendes' })).toBeInTheDocument()
    expect(screen.getByLabelText('Entrada')).toHaveValue('22/11/2026')
    expect(screen.getByLabelText('Saída')).toHaveValue('27/11/2026')
    expect(screen.getByLabelText('Valor total')).toHaveValue('3.300,00')
    expect(screen.queryByLabelText('Contrato de temporada')).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('Valor total'))
    await user.type(screen.getByLabelText('Valor total'), '3.500,00')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Carla Mendes' })).toBeInTheDocument()
    expect(api.calls.find((call) => call.method === 'PATCH')?.body).toEqual({ totalAmountCents: 350_000, notes: null })

    await user.click(screen.getByRole('link', { name: 'Editar' }))
    await user.clear(await screen.findByLabelText('Saída'))
    await user.type(screen.getByLabelText('Saída'), '29112026')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByText('Estadia')).toBeInTheDocument()
    expect(api.calls.filter((call) => call.method === 'PATCH').at(-1)?.body).toEqual({
      totalAmountCents: 350_000,
      notes: null,
      checkOut: '2026-11-29',
    })
    expect(screen.getByText('7 noites')).toBeInTheDocument()
  })

  it('shows the stay in the way when the new dates clash with another reservation', async () => {
    const user = userEvent.setup()
    const beira = flat()
    const first = makeReservation({ propertyId: beira.id, checkIn: '2026-11-22', checkOut: '2026-11-27' })
    const second = makeReservation({ propertyId: beira.id, checkIn: '2026-12-01', checkOut: '2026-12-05' })
    fakeApi({ session: makeSession(), properties: [beira], reservations: [first, second] })
    renderRoute(`/app/reservas/${first.id}/editar`)

    await user.clear(await screen.findByLabelText('Saída'))
    await user.type(screen.getByLabelText('Saída'), '03122026')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('de 01/12/2026 a 05/12/2026')
  })

  it('keeps a linked contract that is no longer active in the menu', async () => {
    const beira = flat()
    const contract = makeContract({
      propertyId: beira.id,
      contractType: 'short_stay',
      rentTerms: null,
      status: 'ended',
      occupant: { id: 'o-1', name: 'Temporada Santos', document: null, email: null, phone: null },
    })
    const reservation = makeReservation({ propertyId: beira.id, contractId: contract.id })
    fakeApi({ session: makeSession(), properties: [beira], contracts: [contract], reservations: [reservation] })
    renderRoute(`/app/reservas/${reservation.id}/editar`)

    const select = await screen.findByRole('combobox', { name: 'Contrato de temporada' })
    await waitFor(() => expect(select).toHaveTextContent('Temporada Santos · 08/01/2026 a 07/01/2028 (encerrado)'))
  })

  it('sends a cancelled reservation back to its page', async () => {
    const reservation = makeReservation({ status: 'cancelled' })
    fakeApi({ session: makeSession(), reservations: [reservation] })
    const { router } = renderRoute(`/app/reservas/${reservation.id}/editar`)

    expect(await screen.findByText(/Esta reserva foi cancelada/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/app/reservas/${reservation.id}`)
  })
})
