import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, json, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

function names() {
  return within(screen.getByRole('region', { name: 'Lista de imobiliárias' }))
    .queryAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('Agencies', { timeout: 20_000 }, () => {
  it('lists the agencies under their own tab', async () => {
    fakeApi({ session: makeSession(), agencies: [{ id: 'a-2', name: 'Zeta Imóveis' }, { id: 'a-1', name: 'Imobiliária Central' }] })
    renderRoute('/app/clientes/imobiliarias')

    expect(await screen.findByRole('heading', { level: 1, name: 'Imobiliárias' })).toBeInTheDocument()
    expect(await screen.findByText('2 imobiliárias, compartilhadas por todos da organização')).toBeInTheDocument()
    expect(names()).toEqual(['Imobiliária Central', 'Zeta Imóveis'])
    const tabs = screen.getByRole('navigation', { name: 'Cadastros' })
    expect(within(tabs).getByRole('link', { name: 'Imobiliárias', current: 'page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clientes', current: false })).toBeDefined()
  })

  it('adds an agency, checking the name first', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession() })
    renderRoute('/app/clientes/imobiliarias')

    expect(await screen.findByText('Nenhuma imobiliária cadastrada ainda')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nome da nova imobiliária'), 'A')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome (pelo menos 2 letras).')
    expect(api.calls.some((call) => call.method === 'POST')).toBe(false)

    await user.clear(screen.getByLabelText('Nome da nova imobiliária'))
    await user.type(screen.getByLabelText('Nome da nova imobiliária'), 'Imobiliária Norte')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    await waitFor(() => expect(names()).toEqual(['Imobiliária Norte']))
    expect(api.calls.find((call) => call.method === 'POST')?.body).toEqual({ name: 'Imobiliária Norte' })
    expect(screen.getByLabelText('Nome da nova imobiliária')).toHaveValue('')
  })

  it('renames an agency in place', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession(), agencies: [{ id: 'a-1', name: 'Imobiliária Central' }] })
    renderRoute('/app/clientes/imobiliarias')

    await user.click(await screen.findByRole('button', { name: 'Renomear Imobiliária Central' }))
    const field = screen.getByLabelText('Novo nome de Imobiliária Central')
    expect(field).toHaveValue('Imobiliária Central')
    await user.clear(field)
    await user.type(field, 'Central Imóveis{Enter}')

    await waitFor(() => expect(names()).toEqual(['Central Imóveis']))
    expect(api.calls.find((call) => call.method === 'PATCH')?.body).toEqual({ name: 'Central Imóveis' })
  })

  it('deletes an unused agency, and says why it cannot delete one that still manages properties', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      session: makeSession(),
      agencies: [{ id: 'a-1', name: 'Imobiliária Central' }, { id: 'a-2', name: 'Zeta Imóveis' }],
      properties: [makePropertyRecord({ agencyId: 'a-1', agencyName: 'Imobiliária Central' })],
    })
    renderRoute('/app/clientes/imobiliarias')

    await user.click(await screen.findByRole('button', { name: 'Excluir Imobiliária Central' }))
    let dialog = await screen.findByRole('alertdialog', { name: 'Excluir Imobiliária Central?' })
    await user.click(within(dialog).getByRole('button', { name: 'Excluir imobiliária' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('ainda administra 1 imóvel')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await user.click(screen.getByRole('button', { name: 'Excluir Zeta Imóveis' }))
    dialog = await screen.findByRole('alertdialog', { name: 'Excluir Zeta Imóveis?' })
    await user.click(within(dialog).getByRole('button', { name: 'Excluir imobiliária' }))

    await waitFor(() => expect(names()).toEqual(['Imobiliária Central']))
    expect(api.state.agencies).toHaveLength(1)
  })

  it('offers no delete while an admin is seeing the app as someone else', async () => {
    fakeApi({ session: makeSession({ impersonatedById: 'admin-1' }), agencies: [{ id: 'a-1', name: 'Imobiliária Central' }] })
    renderRoute('/app/clientes/imobiliarias')

    await screen.findByRole('button', { name: 'Renomear Imobiliária Central' })
    expect(screen.queryByRole('button', { name: 'Excluir Imobiliária Central' })).not.toBeInTheDocument()
  })

  it('says what the API refused when adding an agency, and when it did not answer', async () => {
    const user = userEvent.setup()
    let failure = json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: [{ path: 'name', message: 'Too short' }] } }, 400)
    fakeApi({ session: makeSession(), handlers: { 'POST /api/agencies': () => failure } })
    renderRoute('/app/clientes/imobiliarias')

    await user.type(await screen.findByLabelText('Nome da nova imobiliária'), 'Imobiliária Norte')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o nome (pelo menos 2 letras).')

    failure = json({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }, 500)
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar agora. Tente de novo.'))
    expect(screen.getByLabelText('Nome da nova imobiliária')).toHaveValue('Imobiliária Norte')
  })

  it('leaves a rename without saving, by Cancel or by Escape', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession(), agencies: [{ id: 'a-1', name: 'Imobiliária Central' }] })
    renderRoute('/app/clientes/imobiliarias')

    await user.click(await screen.findByRole('button', { name: 'Renomear Imobiliária Central' }))
    await user.type(screen.getByLabelText('Novo nome de Imobiliária Central'), ' Norte')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByLabelText('Novo nome de Imobiliária Central')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Renomear Imobiliária Central' }))
    await user.type(screen.getByLabelText('Novo nome de Imobiliária Central'), '{Escape}')
    expect(screen.queryByLabelText('Novo nome de Imobiliária Central')).not.toBeInTheDocument()
    expect(names()).toEqual(['Imobiliária Central'])
    expect(api.calls.some((call) => call.method === 'PATCH')).toBe(false)
  })

  it('explains a delete the API blocked because an admin is seeing the app as someone else', async () => {
    const user = userEvent.setup()
    fakeApi({
      session: makeSession(),
      agencies: [{ id: 'a-1', name: 'Imobiliária Central' }],
      handlers: { 'DELETE /api/agencies/a-1': () => json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }, 403) },
    })
    renderRoute('/app/clientes/imobiliarias')

    await user.click(await screen.findByRole('button', { name: 'Excluir Imobiliária Central' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Excluir imobiliária' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Exclusões ficam bloqueadas')
  })
})
