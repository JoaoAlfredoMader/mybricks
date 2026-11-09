import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, json, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

describe('App layout', () => {
  it('names the organization and lists the sections', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app')

    expect(await screen.findByText('Portfólio de Ana')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Seções' })
    expect(nav).toHaveTextContent('Painel')
    expect(nav).toHaveTextContent('Imóveis')
    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute('href', '/app')
  })

  it('signs out and goes back to the landing page', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      session: makeSession(),
      handlers: {
        'POST /api/auth/sign-out': () => {
          api.state.session = null
          return json({ success: true })
        },
      },
    })
    const { router } = renderRoute('/app')

    // One button for small screens and one in the sidebar; CSS shows only one.
    const [signOut] = await screen.findAllByRole('button', { name: 'Sair' })
    await user.click(signOut!)

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(api.callsTo('/api/auth/sign-out')).toHaveLength(1)
  })

  it('warns while an admin is seeing the app as someone else', async () => {
    fakeApi({ session: makeSession({ impersonatedById: 'admin-1' }) })
    renderRoute('/app')

    expect(await screen.findByRole('status')).toHaveTextContent('Você está vendo o sistema como Ana Souza')
    expect(screen.getByRole('button', { name: 'Voltar para minha conta' })).toBeInTheDocument()
  })

  it('goes back to the admin own account and drops the warning', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      session: makeSession({ impersonatedById: 'admin-1' }),
      handlers: {
        'POST /api/auth/admin/stop-impersonating': () => {
          api.state.session = makeSession()
          return json({ session: {}, user: {} })
        },
      },
    })
    renderRoute('/app')

    await user.click(await screen.findByRole('button', { name: 'Voltar para minha conta' }))

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(api.callsTo('/api/auth/admin/stop-impersonating')).toHaveLength(1)
  })

  it('shows no warning in a normal session', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app')

    await screen.findByRole('heading', { level: 1, name: 'Painel' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
