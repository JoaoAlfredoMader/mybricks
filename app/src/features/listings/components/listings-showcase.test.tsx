import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fakeApi, json, makeListing, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

describe('Listings on the landing and in the panel', () => {
  it('shows the listings on the landing to a visitor, after the story', async () => {
    const api = fakeApi({ listings: [makeListing(), makeListing({ neighborhood: 'Trindade' })] })
    renderRoute('/')

    expect(await screen.findByRole('heading', { level: 2, name: 'Imóveis à venda' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Apartamento no Trindade' })).toBeInTheDocument()
    expect(api.callsTo('/api/listings')[0]?.query.get('limit')).toBe('12')

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings.indexOf('Imóveis à venda')).toBeGreaterThan(headings.indexOf('Uma carteira de imóveis, do contrato ao rendimento.'))
  })

  it('shows them in the panel too', async () => {
    fakeApi({ session: makeSession(), listings: [makeListing()] })
    renderRoute('/app')

    expect(await screen.findByRole('heading', { level: 2, name: 'Imóveis à venda' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Falar no WhatsApp sobre Apartamento no Centro' })).toBeInTheDocument()
  })

  it('leaves the section out when there are no listings', async () => {
    const api = fakeApi({ session: makeSession(), listings: [] })
    renderRoute('/app')

    await screen.findByRole('heading', { level: 1, name: 'Painel' })
    await waitFor(() => expect(api.callsTo('/api/listings')).toHaveLength(1))
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
    expect(screen.queryByRole('heading', { name: 'Imóveis à venda' })).not.toBeInTheDocument()
    expect(screen.queryByText(/em breve/i)).not.toBeInTheDocument()
  })

  it('leaves the section out when the API fails', async () => {
    const api = fakeApi({
      listings: [makeListing()],
      handlers: { 'GET /api/listings': () => json({ error: { code: 'INTERNAL_ERROR', message: 'Boom' } }, 500) },
    })
    renderRoute('/')

    await screen.findByRole('heading', { level: 1, name: 'MyBricks' })
    await waitFor(() => expect(api.callsTo('/api/listings').length).toBeGreaterThanOrEqual(2), { timeout: 5000 })
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull(), { timeout: 5000 })
    expect(screen.queryByRole('heading', { name: 'Imóveis à venda' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Uma carteira de imóveis/ })).toBeInTheDocument()
  })
})
