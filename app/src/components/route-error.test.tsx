import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, json, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

// React and the router log the error they hand to the error component.
beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe('RouteError', () => {
  it('replaces a page whose data could not be loaded, and tries again on request', async () => {
    const user = userEvent.setup()
    let down = true
    const api = fakeApi({
      session: makeSession(),
      handlers: {
        'GET /api/me': () => (down ? json({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }, 500) : json(makeSession())),
      },
    })
    renderRoute('/app')

    expect(await screen.findByRole('heading', { name: 'Não foi possível carregar esta página' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/')

    down = false
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(api.callsTo('/api/me').length).toBeGreaterThan(1)
  })
})
