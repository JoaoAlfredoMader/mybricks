import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fakeApi, makeContract, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

describe('Contracts on the property page', { timeout: 20_000 }, () => {
  it('lists the property contracts and links to a new one', async () => {
    const centro = makePropertyRecord()
    fakeApi({
      session: makeSession(),
      properties: [centro],
      contracts: [makeContract({ propertyId: centro.id })],
    })
    renderRoute(`/app/imoveis/${centro.id}`)

    const section = await screen.findByRole('region', { name: 'Contratos' })
    expect(await within(section).findByRole('link', { name: 'Ana Carolina Souza' })).toBeInTheDocument()
    expect(section.textContent?.replace(/ /g, ' ')).toContain('Locação · 08/01/2026 a 07/01/2028 · R$ 3.800,00/mês')
    expect(within(section).getByRole('link', { name: 'Novo contrato' })).toHaveAttribute('href', `/app/contratos/novo?propertyId=${centro.id}`)
    expect(within(section).getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', `/app/contratos?propertyId=${centro.id}`)
  })

  it('leaves the card out for a property for own use', async () => {
    const casa = makePropertyRecord({ usageType: 'own_use', status: 'own_use' })
    fakeApi({ session: makeSession(), properties: [casa] })
    renderRoute(`/app/imoveis/${casa.id}`)

    await screen.findByRole('heading', { level: 1, name: 'Apartamento Centro' })
    expect(screen.queryByRole('region', { name: 'Contratos' })).not.toBeInTheDocument()
  })
})
