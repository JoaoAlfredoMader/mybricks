import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, makeClient, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

function rows() {
  return within(screen.getByRole('region', { name: 'Lista de clientes' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent).join(' | '))
}

/** The label/value pairs of one detail card. */
function card(title: string) {
  const section = screen.getByRole('region', { name: title })
  const labels = within(section).getAllByRole('term').map((term) => term.textContent)
  const values = within(section).getAllByRole('definition').map((value) => value.textContent)
  return Object.fromEntries(labels.map((label, i) => [label, values[i]]))
}

const horizonte = () =>
  makeClient({ name: 'Construtora Horizonte Ltda', personType: 'company', document: '11222333000181', email: 'contato@horizonte.com.br', whatsapp: '1133445566' })

describe('Client list', { timeout: 20_000 }, () => {
  it('lists the clients by name with their documents, and filters them in the URL', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), clients: [makeClient({ name: 'Maria Oliveira' }), horizonte(), makeClient({ name: 'João Pereira', document: null, email: null, whatsapp: null })] })
    const { router } = renderRoute('/app/clientes')

    expect(await screen.findByRole('heading', { level: 1, name: 'Clientes' })).toBeInTheDocument()
    expect(rows()).toEqual([
      'Construtora Horizonte Ltda | Pessoa jurídica | 11.222.333/0001-81 | contato@horizonte.com.br | (11) 3344-5566',
      'João Pereira | Pessoa física | — | — | —',
      'Maria Oliveira | Pessoa física | 529.982.247-25 | marina@example.com | (11) 98765-4321',
    ])
    const tabs = screen.getByRole('navigation', { name: 'Cadastros' })
    expect(within(tabs).getByRole('link', { name: 'Clientes', current: 'page' })).toBeInTheDocument()
    expect(within(tabs).getByRole('link', { name: 'Imobiliárias' })).toHaveAttribute('href', '/app/clientes/imobiliarias')

    await user.click(screen.getByRole('combobox', { name: 'Tipo de pessoa' }))
    await user.click(await screen.findByRole('option', { name: 'Pessoa jurídica' }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(router.state.location.search).toEqual({ personType: 'company' })

    await user.click(screen.getByRole('combobox', { name: 'Tipo de pessoa' }))
    await user.click(await screen.findByRole('option', { name: 'Todos os tipos' }))
    await user.type(screen.getByRole('searchbox', { name: 'Buscar pelo nome' }), 'maria')
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(router.state.location.search).toEqual({ search: 'maria' })
  })

  it('says so when there is nothing to list', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app/clientes')

    expect(await screen.findByText('Nenhum cliente cadastrado ainda')).toBeInTheDocument()
  })

  it('offers to clear the filters when nothing matches them', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), clients: [makeClient({ name: 'Maria Oliveira' })] })
    const { router } = renderRoute('/app/clientes?personType=company')

    expect(await screen.findByText('Nenhum cliente encontrado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(router.state.location.search).toEqual({})
  })

  it('pages through twenty at a time', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), clients: Array.from({ length: 21 }, (_, i) => makeClient({ name: `Cliente ${String(i + 1).padStart(2, '0')}` })) })
    const { router } = renderRoute('/app/clientes')

    expect(await screen.findByText('1–20 de 21')).toBeInTheDocument()
    expect(rows()).toHaveLength(20)
    await user.click(screen.getByRole('button', { name: 'Próxima' }))

    expect(await screen.findByText('21–21 de 21')).toBeInTheDocument()
    expect(rows()).toHaveLength(1)
    expect(router.state.location.search).toEqual({ page: 2 })

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    await waitFor(() => expect(rows()).toHaveLength(20))
    expect(router.state.location.search).toEqual({})
  })
})

describe('Client page', { timeout: 20_000 }, () => {
  it('shows the client and the properties they own', async () => {
    const client = horizonte()
    const galpao = makePropertyRecord({ name: 'Galpão Logístico', clientId: client.id, ownershipPercentage: 50 })
    const outro = makePropertyRecord({ name: 'Casa de Praia', clientId: 'other' })
    fakeApi({ session: makeSession(), clients: [client], properties: [galpao, outro] })
    renderRoute(`/app/clientes/${client.id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Construtora Horizonte Ltda' })).toBeInTheDocument()
    expect(card('Dados')).toMatchObject({
      Tipo: 'Pessoa jurídica',
      CNPJ: '11.222.333/0001-81',
      'E-mail': 'contato@horizonte.com.br',
      WhatsApp: '(11) 3344-5566',
    })
    const properties = await screen.findByRole('region', { name: 'Imóveis' })
    expect(await within(properties).findByRole('link', { name: 'Galpão Logístico' })).toHaveAttribute('href', `/app/imoveis/${galpao.id}`)
    expect(within(properties).queryByText('Casa de Praia')).not.toBeInTheDocument()
    expect(properties).toHaveTextContent('50% do cliente')
  })

  it('refuses to delete a client who still owns properties, saying how many', async () => {
    const user = userEvent.setup()
    const client = makeClient()
    const a = makePropertyRecord({ clientId: client.id })
    const b = makePropertyRecord({ name: 'Kitnet', clientId: client.id })
    const api = fakeApi({ session: makeSession(), clients: [client], properties: [a, b] })
    renderRoute(`/app/clientes/${client.id}`)

    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Excluir Marina Prado?' })
    await user.click(within(dialog).getByRole('button', { name: 'Excluir cliente' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('ainda é dono de 2 imóveis')
    expect(api.state.clients).toHaveLength(1)
  })

  it('deletes a client without properties and goes back to the list', async () => {
    const user = userEvent.setup()
    const client = makeClient()
    const other = makeClient({ name: 'João Pereira' })
    fakeApi({ session: makeSession(), clients: [client, other] })
    const { router } = renderRoute(`/app/clientes/${client.id}`)

    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Excluir cliente' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/app/clientes'))
    expect(await screen.findByText('1 cliente, os donos dos imóveis')).toBeInTheDocument()
  })

  it('offers no delete while an admin is seeing the app as someone else', async () => {
    const client = makeClient()
    fakeApi({ session: makeSession({ impersonatedById: 'admin-1' }), clients: [client] })
    renderRoute(`/app/clientes/${client.id}`)

    await screen.findByRole('heading', { level: 1, name: 'Marina Prado' })
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar' })).toBeInTheDocument()
  })

  it('says so when the client is not in this portfolio', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app/clientes/00000000-0000-4000-b000-999999999999')

    expect(await screen.findByRole('heading', { level: 1, name: 'Cliente não encontrado' })).toBeInTheDocument()
  })
})
