import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fakeApi, makePropertyRecord, makeReservation, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

const flat = () => makePropertyRecord({ name: 'Flat Beira-Mar', usageType: 'short_stay', rentalMode: 'contract' })

describe('Reservations on the property page', { timeout: 20_000 }, () => {
  it('lists the reservations of a short-stay property and links to a new one', async () => {
    const beira = flat()
    fakeApi({
      session: makeSession(),
      properties: [beira],
      reservations: [makeReservation({ propertyId: beira.id })],
    })
    renderRoute(`/app/imoveis/${beira.id}`)

    const section = await screen.findByRole('region', { name: 'Reservas' })
    expect(await within(section).findByRole('link', { name: 'Carla Mendes' })).toBeInTheDocument()
    expect(section.textContent?.replace(/ /g, ' ')).toContain('22/11/2026 a 27/11/2026 · 5 noites · R$ 3.300,00')
    expect(within(section).getByRole('link', { name: 'Nova reserva' })).toHaveAttribute('href', `/app/reservas/nova?propertyId=${beira.id}`)
    expect(within(section).getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', `/app/reservas?propertyId=${beira.id}`)
  })

  it('leaves the card out for a property that is not short-stay', async () => {
    const centro = makePropertyRecord()
    fakeApi({ session: makeSession(), properties: [centro] })
    renderRoute(`/app/imoveis/${centro.id}`)

    await screen.findByRole('heading', { level: 1, name: 'Apartamento Centro' })
    expect(screen.queryByRole('region', { name: 'Reservas' })).not.toBeInTheDocument()
  })
})
