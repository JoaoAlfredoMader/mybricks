import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fakeApi, makePropertyRecord, makeSession, makeTransaction } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

// Intl separates the currency sign with a no-break space.
const plain = (value: string | null | undefined) => value?.replace(/\u00a0/g, ' ')

describe('Transactions on the property page', { timeout: 20_000 }, () => {
  it('lists the property transactions and links to a new one', async () => {
    const centro = makePropertyRecord()
    fakeApi({ session: makeSession(), properties: [centro], transactions: [makeTransaction({ propertyId: centro.id })] })
    renderRoute(`/app/imoveis/${centro.id}`)

    const section = await screen.findByRole('region', { name: 'Lançamentos' })
    expect(await within(section).findByRole('link', { name: 'Reforma' })).toBeInTheDocument()
    expect(plain(section.textContent)).toContain('23/10/2026 · Avulso · Pintura geral')
    expect(plain(section.textContent)).toContain('− R$ 12.000,00')
    expect(within(section).getByRole('link', { name: 'Novo lançamento' })).toHaveAttribute('href', `/app/financas/novo?propertyId=${centro.id}`)
    expect(within(section).getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', `/app/financas?propertyId=${centro.id}`)
  })
})
