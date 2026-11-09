import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, json, makeClient, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

describe('New client', { timeout: 20_000 }, () => {
  it('checks the fields, then registers the client and opens it', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession() })
    const { router } = renderRoute('/app/clientes/novo')

    expect(await screen.findByRole('heading', { level: 1, name: 'Novo cliente' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }))
    expect(await screen.findByText('Informe o nome (pelo menos 2 letras).')).toBeInTheDocument()
    expect(api.calls.some((call) => call.method === 'POST')).toBe(false)

    await user.type(screen.getByLabelText('Nome'), 'Ana Souza')
    await user.type(screen.getByLabelText('CPF'), '123')
    await user.type(screen.getByLabelText('E-mail'), 'ana-sem-arroba')
    await user.type(screen.getByLabelText('WhatsApp'), '99')
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }))
    expect(await screen.findByText('CPF com 11 dígitos.')).toBeInTheDocument()
    expect(screen.getByText('E-mail no formato nome@exemplo.com.')).toBeInTheDocument()
    expect(screen.getByText('WhatsApp com DDD, por exemplo (11) 98765-4321.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('CPF'))
    await user.type(screen.getByLabelText('CPF'), '529.982.247-25')
    await user.clear(screen.getByLabelText('E-mail'))
    await user.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com.br')
    await user.clear(screen.getByLabelText('WhatsApp'))
    await user.type(screen.getByLabelText('WhatsApp'), '(21) 98888-7777')
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Souza' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/app\/clientes\/[\w-]+$/)
    expect(api.calls.find((call) => call.method === 'POST')?.body).toEqual({
      name: 'Ana Souza',
      personType: 'individual',
      document: '52998224725',
      email: 'ana@exemplo.com.br',
      whatsapp: '21988887777',
    })
  })

  it('asks for a CNPJ once the client is a company, and sends only the name when nothing else is filled', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession() })
    renderRoute('/app/clientes/novo')

    await user.click(await screen.findByRole('radio', { name: 'Pessoa jurídica' }))
    expect(screen.getByLabelText('CNPJ')).toBeInTheDocument()
    expect(screen.queryByLabelText('CPF')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Nome'), 'Construtora Horizonte')
    await user.type(screen.getByLabelText('CNPJ'), '11.222.333/0001')
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }))
    expect(await screen.findByText('CNPJ com 14 dígitos.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('CNPJ'))
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Construtora Horizonte' })).toBeInTheDocument()
    expect(api.calls.find((call) => call.method === 'POST')?.body).toEqual({
      name: 'Construtora Horizonte',
      personType: 'company',
      document: null,
      email: null,
      whatsapp: null,
    })
  })

  it('puts the API\'s refusal of a document under its field, in Portuguese', async () => {
    const user = userEvent.setup()
    fakeApi({
      session: makeSession(),
      handlers: {
        'POST /api/clients': () =>
          json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: [{ path: 'document', message: 'Invalid CPF' }] } }, 400),
      },
    })
    renderRoute('/app/clientes/novo')

    await user.type(await screen.findByLabelText('Nome'), 'Ana Souza')
    await user.type(screen.getByLabelText('CPF'), '111.111.111-11')
    await user.click(screen.getByRole('button', { name: 'Cadastrar cliente' }))

    expect(await screen.findByText('CPF inválido.')).toBeInTheDocument()
  })
})

describe('Editing a client', { timeout: 20_000 }, () => {
  it('starts from what is stored and sends every field, with null for what was cleared', async () => {
    const user = userEvent.setup()
    const client = makeClient()
    const api = fakeApi({ session: makeSession(), clients: [client] })
    renderRoute(`/app/clientes/${client.id}/editar`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Editar Marina Prado' })).toBeInTheDocument()
    expect(screen.getByLabelText('CPF')).toHaveValue('529.982.247-25')
    expect(screen.getByLabelText('WhatsApp')).toHaveValue('(11) 98765-4321')

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Marina Prado Souza')
    await user.clear(screen.getByLabelText('WhatsApp'))
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Marina Prado Souza' })).toBeInTheDocument()
    expect(api.calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      name: 'Marina Prado Souza',
      personType: 'individual',
      document: '52998224725',
      email: 'marina@example.com',
      whatsapp: null,
    })
  })
})
