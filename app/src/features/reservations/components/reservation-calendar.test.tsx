import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, json, makePropertyRecord, makeReservation, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

const guest = (name: string) => ({ id: `guest-${name}`, name, document: null, email: null, phone: null })

const flat = () => makePropertyRecord({ name: 'Flat Beira-Mar', usageType: 'short_stay' })
const chale = () => makePropertyRecord({ name: 'Chalé da Serra', usageType: 'short_stay' })

/** The bars of the calendar: one link per stay, named by its guest and dates. */
function bars() {
  return within(screen.getByRole('group', { name: /^Calendário de/ })).getAllByRole('link', { name: /noite/ })
}

const px = (value: string) => Number.parseFloat(value)

describe('Reservation calendar', { timeout: 20_000 }, () => {
  // Today is read from the viewer's calendar; only the date is frozen, timers keep running.
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 5) }))
  afterEach(() => vi.useRealTimers())

  it('draws a row per short-stay property and a bar per confirmed stay of the month', async () => {
    const beira = flat()
    const serra = chale()
    const apartamento = makePropertyRecord({ name: 'Apartamento Centro' })
    const api = fakeApi({
      session: makeSession(),
      properties: [beira, serra, apartamento],
      reservations: [
        makeReservation({ propertyId: beira.id, checkIn: '2026-11-22', checkOut: '2026-11-27', nights: 5, guest: guest('Carla Mendes') }),
        makeReservation({ propertyId: serra.id, propertyName: 'Chalé da Serra', checkIn: '2026-11-03', checkOut: '2026-11-06', nights: 3, guest: guest('Roberto Lima') }),
        makeReservation({ propertyId: beira.id, checkIn: '2026-10-10', checkOut: '2026-10-15', guest: guest('Fora do mês') }),
        makeReservation({ propertyId: beira.id, status: 'cancelled', checkIn: '2026-11-10', checkOut: '2026-11-12', guest: guest('Cancelada') }),
      ],
    })
    renderRoute('/app/reservas/calendario')

    expect(await screen.findByRole('heading', { level: 2, name: 'novembro de 2026' })).toBeInTheDocument()
    const calendar = await screen.findByRole('group', { name: 'Calendário de novembro de 2026' })
    // One row per short-stay property, by name as the API lists them; the apartment has no row.
    expect(within(calendar).getAllByRole('group').map((row) => row.getAttribute('aria-label'))).toEqual(['Chalé da Serra', 'Flat Beira-Mar'])
    await waitFor(() => expect(bars()).toHaveLength(2))
    expect(bars().map((bar) => bar.getAttribute('aria-label')).sort()).toEqual([
      'Carla Mendes, de 22/11/2026 a 27/11/2026, 5 noites',
      'Roberto Lima, de 03/11/2026 a 06/11/2026, 3 noites',
    ])
    expect(screen.getByText('2 estadias confirmadas em novembro de 2026')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Apartamento Centro' })).not.toBeInTheDocument()

    const request = api.callsTo('/api/reservations').at(-1)!
    expect([request.query.get('from'), request.query.get('to'), request.query.get('status'), request.query.get('pageSize')]).toEqual([
      '2026-11-01',
      '2026-12-01',
      'confirmed',
      '100',
    ])
  })

  it('marks today, and writes a guest\'s name in a bar only when it fits', async () => {
    const beira = flat()
    fakeApi({
      session: makeSession(),
      properties: [beira],
      reservations: [
        makeReservation({ propertyId: beira.id, checkIn: '2026-11-10', checkOut: '2026-11-16', nights: 6, guest: guest('Carla Mendes') }),
        makeReservation({ propertyId: beira.id, checkIn: '2026-11-20', checkOut: '2026-11-21', nights: 1, guest: guest('Maria Fernanda Albuquerque') }),
      ],
    })
    renderRoute('/app/reservas/calendario')

    await waitFor(() => expect(bars()).toHaveLength(2))
    expect(screen.getByText('5', { selector: '[aria-current=date]' })).toBeInTheDocument()
    const [long, short] = bars().sort((a, b) => a.getAttribute('aria-label')!.localeCompare(b.getAttribute('aria-label')!))
    expect(long).toHaveTextContent('Carla Mendes')
    expect(short).toHaveTextContent('')
    expect(short).toHaveAccessibleName('Maria Fernanda Albuquerque, de 20/11/2026 a 21/11/2026, 1 noite')
  })

  it('lets two stays that meet on a turnover day touch, a hair apart, and leaves the edge open for one that crosses the month', async () => {
    const beira = flat()
    fakeApi({
      session: makeSession(),
      properties: [beira],
      reservations: [
        makeReservation({ propertyId: beira.id, checkIn: '2026-10-28', checkOut: '2026-11-03', nights: 6, guest: guest('Entrou antes') }),
        makeReservation({ propertyId: beira.id, checkIn: '2026-11-03', checkOut: '2026-11-08', nights: 5, guest: guest('Segue') }),
        makeReservation({ propertyId: beira.id, checkIn: '2026-11-28', checkOut: '2026-12-04', nights: 6, guest: guest('Sai depois') }),
      ],
    })
    renderRoute('/app/reservas/calendario')

    await waitFor(() => expect(bars()).toHaveLength(3))
    const byName = Object.fromEntries(bars().map((bar) => [bar.getAttribute('aria-label')!.split(',')[0], bar]))
    const first = byName['Entrou antes']!
    const second = byName['Segue']!
    const gap = px(second.style.left) - (px(first.style.left) + px(first.style.width))
    expect(gap).toBeGreaterThanOrEqual(1)
    expect(gap).toBeLessThanOrEqual(3)
    expect(px(first.style.left)).toBe(1)
    expect(first.className).toContain('rounded-l-none')
    expect(first.className).not.toContain('rounded-r-none')
    expect(byName['Sai depois']!.className).toContain('rounded-r-none')
    expect(second.className).not.toContain('rounded-l-none')
  })

  it('shows the whole stay beside its bar on focus, and takes it away on blur', async () => {
    const beira = flat()
    fakeApi({
      session: makeSession(),
      properties: [beira],
      reservations: [
        makeReservation({ propertyId: beira.id, checkIn: '2026-11-22', checkOut: '2026-11-27', nights: 5, totalAmountCents: 330_000, contractId: 'contract-1', guest: guest('Carla Mendes') }),
      ],
    })
    renderRoute('/app/reservas/calendario')

    await waitFor(() => expect(bars()).toHaveLength(1))
    fireEvent.focus(bars()[0]!)
    const readout = (await screen.findByText('Flat Beira-Mar', { selector: 'p' })).parentElement!
    const text = readout.textContent!.replace(/ /g, ' ')
    expect(text).toContain('Carla Mendes')
    expect(text).toContain('22/11/2026 a 27/11/2026')
    expect(text).toContain('5 noites')
    expect(text).toContain('R$ 3.300,00')
    expect(text).toContain('Ligado')

    fireEvent.blur(bars()[0]!)
    await waitFor(() => expect(screen.queryByText('Flat Beira-Mar', { selector: 'p' })).not.toBeInTheDocument())
  })

  it('opens the reservation from its bar', async () => {
    const beira = flat()
    const stay = makeReservation({ propertyId: beira.id, checkIn: '2026-11-22', checkOut: '2026-11-27', guest: guest('Carla Mendes') })
    fakeApi({ session: makeSession(), properties: [beira], reservations: [stay] })
    renderRoute('/app/reservas/calendario')

    await waitFor(() => expect(bars()).toHaveLength(1))
    expect(bars()[0]).toHaveAttribute('href', `/app/reservas/${stay.id}`)
  })

  it('moves between months, keeps the month in the URL and goes back to today', async () => {
    const user = userEvent.setup()
    const beira = flat()
    const api = fakeApi({
      session: makeSession(),
      properties: [beira],
      reservations: [makeReservation({ propertyId: beira.id, checkIn: '2026-12-05', checkOut: '2026-12-09', nights: 4, guest: guest('Dezembro') })],
    })
    const { router } = renderRoute('/app/reservas/calendario')

    await screen.findByRole('heading', { level: 2, name: 'novembro de 2026' })
    expect(screen.getByRole('button', { name: 'Hoje' })).toBeDisabled()
    expect(router.state.location.search).toEqual({})

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'dezembro de 2026' })).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ month: '2026-12' })
    await waitFor(() => expect(bars()).toHaveLength(1))
    expect(api.callsTo('/api/reservations').at(-1)!.query.get('from')).toBe('2026-12-01')
    expect(screen.getByRole('button', { name: 'Hoje' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'outubro de 2026' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hoje' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'novembro de 2026' })).toBeInTheDocument()
    expect(router.state.location.search).toEqual({})
  })

  it('opens on the month in the URL, and falls back to this month when it is malformed', async () => {
    fakeApi({ session: makeSession(), properties: [flat()] })
    renderRoute('/app/reservas/calendario?month=2027-03')
    expect(await screen.findByRole('heading', { level: 2, name: 'março de 2027' })).toBeInTheDocument()
  })

  it('falls back to this month for a month that does not exist', async () => {
    fakeApi({ session: makeSession(), properties: [flat()] })
    renderRoute('/app/reservas/calendario?month=2026-13')
    expect(await screen.findByRole('heading', { level: 2, name: 'novembro de 2026' })).toBeInTheDocument()
  })

  it('says so when the month has no stay, and when there is no short-stay property at all', async () => {
    fakeApi({ session: makeSession(), properties: [flat()] })
    const { unmount } = renderRoute('/app/reservas/calendario')
    expect(await screen.findByText('Nenhuma estadia confirmada em novembro de 2026.')).toBeInTheDocument()
    unmount()

    fakeApi({ session: makeSession(), properties: [makePropertyRecord({ name: 'Apartamento Centro' })] })
    renderRoute('/app/reservas/calendario')
    expect(await screen.findByText('Nenhum imóvel de temporada ainda')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cadastrar um imóvel' })).toHaveAttribute('href', '/app/imoveis/novo')
  })

  it('warns when the month has more stays than the API sends in a page', async () => {
    const beira = flat()
    const stay = makeReservation({ propertyId: beira.id, checkIn: '2026-11-22', checkOut: '2026-11-27', guest: guest('Carla Mendes') })
    fakeApi({
      session: makeSession(),
      properties: [beira],
      handlers: { 'GET /api/reservations': () => json({ items: [stay], page: 1, pageSize: 100, total: 130 }) },
    })
    renderRoute('/app/reservas/calendario')

    expect(await screen.findByRole('status')).toHaveTextContent('Este mês tem 130 estadias e o calendário mostra 1')
  })

  it('switches between the list and the calendar of the same reservations', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), properties: [flat()] })
    const { router } = renderRoute('/app/reservas')

    const views = await screen.findByRole('navigation', { name: 'Formas de ver as reservas' })
    expect(within(views).getByRole('link', { name: 'Lista', current: 'page' })).toBeInTheDocument()
    await user.click(within(views).getByRole('link', { name: 'Calendário' }))

    expect(await screen.findByRole('group', { name: /^Calendário de/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/app/reservas/calendario')
    expect(within(screen.getByRole('navigation', { name: 'Formas de ver as reservas' })).getByRole('link', { name: 'Calendário', current: 'page' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('navigation', { name: 'Formas de ver as reservas' })).getByRole('link', { name: 'Lista' }))
    expect(await screen.findByRole('region', { name: 'Lista de reservas' })).toBeInTheDocument()
  })
})
