import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, json, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

describe('Login page', () => {
  it('signs in with e-mail and password and opens the app', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      handlers: {
        'POST /api/auth/sign-in/email': () => {
          api.state.session = makeSession()
          return json({ token: 't', user: { id: 'user-1' } })
        },
      },
    })
    const { router } = renderRoute('/login')

    await user.type(await screen.findByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'segredo123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/app')
    expect(api.callsTo('/api/auth/sign-in/email')[0]?.body).toMatchObject({
      email: 'ana@example.com',
      password: 'segredo123',
    })
  })

  it('checks the fields before calling the API', async () => {
    const user = userEvent.setup()
    const api = fakeApi()
    renderRoute('/login')

    await user.type(await screen.findByLabelText('E-mail'), 'ana@')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Este e-mail não parece válido.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(api.callsTo('/api/auth/sign-in/email')).toHaveLength(0)
  })

  it('explains a wrong password in Portuguese', async () => {
    const user = userEvent.setup()
    fakeApi({
      handlers: {
        'POST /api/auth/sign-in/email': () =>
          json({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' }, 401),
      },
    })
    renderRoute('/login')

    await user.type(await screen.findByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'errada123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
  })

  it('creates an account', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      handlers: {
        'POST /api/auth/sign-up/email': () => {
          api.state.session = makeSession({ user: { name: 'Bruno Lima' } })
          return json({ token: 't', user: { id: 'user-2' } })
        },
      },
    })
    renderRoute('/login')

    await user.click(await screen.findByRole('tab', { name: 'Criar conta' }))
    await user.type(screen.getByLabelText('Nome'), 'Bruno Lima')
    await user.type(screen.getByLabelText('E-mail'), 'bruno@example.com')
    await user.type(screen.getByLabelText('Senha'), 'curta')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Senha'), '-e-longa')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(api.callsTo('/api/auth/sign-up/email')[0]?.body).toMatchObject({
      name: 'Bruno Lima',
      email: 'bruno@example.com',
      password: 'curta-e-longa',
    })
  })

  it('asks to confirm the e-mail when the API holds the session back, and can send the link again', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      handlers: {
        // No session and no token: the account waits for the link in the e-mail.
        'POST /api/auth/sign-up/email': () => json({ token: null, user: { id: 'user-2' } }),
        'POST /api/auth/send-verification-email': () => json({ status: true }),
      },
    })
    renderRoute('/login')

    await user.click(await screen.findByRole('tab', { name: 'Criar conta' }))
    await user.type(screen.getByLabelText('Nome'), 'Bruno Lima')
    await user.type(screen.getByLabelText('E-mail'), 'bruno@example.com')
    await user.type(screen.getByLabelText('Senha'), 'curta-e-longa')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(await screen.findByRole('heading', { name: 'Confirme seu e-mail' })).toBeInTheDocument()
    expect(screen.getByText('bruno@example.com')).toBeInTheDocument()
    expect(api.callsTo('/api/auth/sign-up/email')[0]?.body).toMatchObject({
      callbackURL: 'http://mybricks.test/login',
    })

    await user.click(screen.getByRole('button', { name: 'Reenviar e-mail' }))
    expect(await screen.findByText('Enviamos o link de novo.')).toBeInTheDocument()
    expect(api.callsTo('/api/auth/send-verification-email')[0]?.body).toMatchObject({
      email: 'bruno@example.com',
      callbackURL: 'http://mybricks.test/login',
    })

    await user.click(screen.getByRole('button', { name: 'Usar outro e-mail' }))
    expect(screen.getByLabelText('E-mail')).toHaveValue('bruno@example.com')
  })

  it('says so when the link could not be sent again', async () => {
    const user = userEvent.setup()
    fakeApi({
      handlers: {
        'POST /api/auth/sign-up/email': () => json({ token: null, user: { id: 'user-2' } }),
        'POST /api/auth/send-verification-email': () => json({ message: 'Too many requests' }, 429),
      },
    })
    renderRoute('/login')

    await user.click(await screen.findByRole('tab', { name: 'Criar conta' }))
    await user.type(screen.getByLabelText('Nome'), 'Bruno Lima')
    await user.type(screen.getByLabelText('E-mail'), 'bruno@example.com')
    await user.type(screen.getByLabelText('Senha'), 'curta-e-longa')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
    await user.click(await screen.findByRole('button', { name: 'Reenviar e-mail' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas seguidas.')
  })

  it('explains that an unconfirmed e-mail cannot sign in yet', async () => {
    const user = userEvent.setup()
    fakeApi({
      handlers: {
        'POST /api/auth/sign-in/email': () =>
          json({ code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' }, 403),
      },
    })
    renderRoute('/login')

    await user.type(await screen.findByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'segredo123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Confirme seu e-mail antes de entrar.')
  })

  it('explains a confirmation link that did not work', async () => {
    fakeApi()
    renderRoute('/login?error=INVALID_TOKEN')
    expect(await screen.findByRole('alert')).toHaveTextContent('Este link de confirmação expirou ou já foi usado.')
  })

  it('ignores an unknown ?error= instead of showing it', async () => {
    fakeApi()
    renderRoute('/login?error=whatever')
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar no MyBricks' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('enters the demo as a guest', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      handlers: {
        'POST /api/auth/sign-in/anonymous': () => {
          api.state.session = makeSession({ user: { name: 'Anonymous', isAnonymous: true } })
          return json({ token: 't', user: { id: 'guest-1' } })
        },
      },
    })
    renderRoute('/login')

    await user.click(await screen.findByRole('button', { name: 'Entrar como convidado' }))

    expect(await screen.findByText(/carteira de exemplo, só sua\. Ela será apagada em 23 horas/)).toBeInTheDocument()
  })

  it('goes back to the page that asked for a session', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      handlers: {
        'POST /api/auth/sign-in/email': () => {
          api.state.session = makeSession()
          return json({ token: 't', user: { id: 'user-1' } })
        },
      },
    })
    const { router } = renderRoute('/app')

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toEqual({ redirect: '/app' })

    await user.type(await screen.findByLabelText('E-mail'), 'ana@example.com')
    await user.type(screen.getByLabelText('Senha'), 'segredo123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/app'))
  })

  it('skips the form when already signed in', async () => {
    fakeApi({ session: makeSession() })
    const { router } = renderRoute('/login')

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/app')
  })
})
