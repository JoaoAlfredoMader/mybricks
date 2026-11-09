import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_TEMPLATE, fakeApi, json, makeContract, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

/** jsdom has no `execCommand`; this one types the text where the test says the cursor is. */
function stubEditing() {
  const exec = vi.fn((command: string, _ui?: boolean, value?: string) => {
    if (command === 'insertText') (document.activeElement as HTMLElement).append(value ?? '')
    return true
  })
  Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })
  return exec
}

function editor(name: string) {
  return screen.getByRole('textbox', { name })
}

/** What the editor's DOM holds after someone typed: the text is set, then the browser's `input` event fires. */
function write(name: string, html: string) {
  const element = editor(name)
  element.innerHTML = html
  fireEvent.input(element)
}

function renderRouteWithTemplate() {
  fakeApi({ session: makeSession() })
  return renderRoute('/app/contratos/modelo')
}

const saveButton = () => screen.getByRole('button', { name: /Salvar modelo|Salvando/ })

describe('Contract template', { timeout: 20_000 }, () => {
  beforeEach(() => stubEditing())
  afterEach(() => Reflect.deleteProperty(document, 'execCommand'))

  it('opens on the default template, with the tokens that can be typed', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app/contratos/modelo')

    expect(await screen.findByRole('heading', { level: 1, name: 'Modelo de contrato' })).toBeInTheDocument()
    expect(screen.getByText(/Este é o modelo padrão/)).toBeInTheDocument()
    expect(editor('Cabeçalho').innerHTML).toBe(DEFAULT_TEMPLATE.header)
    expect(editor('Cláusulas')).toHaveTextContent('Cláusula 1ª – Do aluguel')
    const tokens = within(screen.getByRole('complementary', { name: 'Marcadores' })).getAllByRole('button').map((button) => button.textContent)
    expect(tokens).toHaveLength(5)
    expect(tokens[0]).toBe('{{locador}}Nome do locador')
    expect(saveButton()).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Voltar ao padrão' })).not.toBeInTheDocument()
  })

  it('saves what was written, cleaned, and then offers to go back to the default', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession() })
    renderRoute('/app/contratos/modelo')

    await screen.findByRole('textbox', { name: 'Cabeçalho' })
    write('Cabeçalho', '<h1 style="color:red">CONTRATO <script>alert(1)</script>DE TESTE</h1>')
    await user.click(saveButton())

    expect(await screen.findByText('Modelo salvo.')).toBeInTheDocument()
    const put = api.calls.find((call) => call.method === 'PUT')?.body as Record<string, string>
    expect(put).toEqual({ header: '<h1>CONTRATO DE TESTE</h1>', clauses: DEFAULT_TEMPLATE.clauses, footer: DEFAULT_TEMPLATE.footer })
    expect(saveButton()).toBeDisabled()
    expect(screen.getByText(/Modelo da organização, salvo em/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voltar ao padrão' })).toBeInTheDocument()
  })

  it('inserts a token where the cursor is, in the part that was last focused', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession() })
    renderRoute('/app/contratos/modelo')

    await screen.findByRole('textbox', { name: 'Rodapé' })
    editor('Rodapé').focus()
    await user.click(within(screen.getByRole('complementary', { name: 'Marcadores' })).getByRole('button', { name: /\{\{locatario\}\}/ }))

    expect(editor('Rodapé').innerHTML).toContain('{{locatario}}')
    expect(editor('Cláusulas').innerHTML).not.toContain('{{locatario}}{{locatario}}')
    await user.click(saveButton())
    await waitFor(() => expect(api.calls.some((call) => call.method === 'PUT')).toBe(true))
    const put = api.calls.find((call) => call.method === 'PUT')
    expect(put?.body).toMatchObject({ footer: expect.stringContaining('{{locatario}}') })
  })

  it('puts the cursor at the end of the part before inserting a token when it was somewhere else', async () => {
    const user = userEvent.setup()
    renderRouteWithTemplate()
    await screen.findByRole('textbox', { name: 'Rodapé' })
    editor('Rodapé').focus()
    // The cursor left the editor: it is on the page title now.
    window.getSelection()!.selectAllChildren(screen.getByRole('heading', { level: 1, name: 'Modelo de contrato' }))

    await user.click(within(screen.getByRole('complementary', { name: 'Marcadores' })).getByRole('button', { name: /{{locador}}/ }))

    expect(editor('Rodapé').contains(window.getSelection()!.anchorNode)).toBe(true)
    expect(editor('Rodapé').innerHTML).toContain('{{locador}}')
  })

  it('keeps only the words of what is pasted', () => {
    const exec = stubEditing()
    renderRouteWithTemplate()
    return screen.findByRole('textbox', { name: 'Cláusulas' }).then((clauses) => {
      const notPrevented = fireEvent.paste(clauses, { clipboardData: { getData: (type: string) => (type === 'text/plain' ? 'só o texto' : '<b>formatado</b>') } })

      expect(notPrevented).toBe(false)
      expect(exec).toHaveBeenCalledWith('insertText', false, 'só o texto')
    })
  })

  it('formats the selection through the toolbar of the part', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession() })
    const exec = stubEditing()
    renderRoute('/app/contratos/modelo')

    await screen.findByRole('textbox', { name: 'Cláusulas' })
    const toolbar = screen.getByRole('toolbar', { name: 'Formatação de cláusulas' })
    await user.click(within(toolbar).getByRole('button', { name: 'Subtítulo' }))
    await user.click(within(toolbar).getByRole('button', { name: 'Negrito' }))
    await user.click(within(toolbar).getByRole('button', { name: 'Lista numerada' }))

    expect(exec).toHaveBeenCalledWith('formatBlock', false, 'h2')
    expect(exec).toHaveBeenCalledWith('bold', false, undefined)
    expect(exec).toHaveBeenCalledWith('insertOrderedList', false, undefined)
  })

  it('warns about a token that does not exist and says which one was probably meant', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app/contratos/modelo')

    await screen.findByRole('textbox', { name: 'Cláusulas' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    write('Cláusulas', '<p>O locador é {{locadro}} e o valor {{valor}}.</p>')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Estes marcadores não existem')
    expect(alert).toHaveTextContent('{{locadro}} — quis dizer {{locador}}?')
    expect(alert).toHaveTextContent('{{valor}}')
    write('Cláusulas', '<p>O locador é {{locador}}.</p>')
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('refuses clauses with no text before calling the API', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession() })
    renderRoute('/app/contratos/modelo')

    await screen.findByRole('textbox', { name: 'Cláusulas' })
    write('Cláusulas', '<p><br></p>')
    await user.click(saveButton())

    expect(await screen.findByText('As cláusulas precisam ter texto.')).toBeInTheDocument()
    expect(editor('Cláusulas')).toHaveAttribute('aria-invalid', 'true')
    expect(api.calls.some((call) => call.method === 'PUT')).toBe(false)
  })

  it('refuses a part that is over its limit, saying how long it may be', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession() })
    renderRoute('/app/contratos/modelo')

    await screen.findByRole('textbox', { name: 'Rodapé' })
    write('Rodapé', `<p>${'a'.repeat(5_001)}</p>`)
    await user.click(saveButton())

    expect(await screen.findByText('Texto demais: o limite é 5.000 caracteres.')).toBeInTheDocument()
    expect(editor('Rodapé')).toHaveAttribute('aria-invalid', 'true')
    expect(api.calls.some((call) => call.method === 'PUT')).toBe(false)
  })

  it.each([
    [403, { code: 'FORBIDDEN', message: 'Forbidden' }, 'Só donos e administradores podem editar o modelo de contrato.'],
    [400, { code: 'VALIDATION_ERROR', message: 'Invalid', details: [{ path: 'clauses', message: 'Required' }] }, 'As cláusulas precisam ter texto.'],
    [500, { code: 'INTERNAL_ERROR', message: 'boom' }, 'Não foi possível salvar agora. Verifique a conexão e tente de novo.'],
  ])('says what happened when the API answers %i to a save', async (status, error, message) => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), handlers: { 'PUT /api/contract-template': () => json({ error }, status) } })
    renderRoute('/app/contratos/modelo')

    await screen.findByRole('textbox', { name: 'Cabeçalho' })
    write('Cabeçalho', '<h1>NOVO</h1>')
    await user.click(saveButton())

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByText('Modelo salvo.')).not.toBeInTheDocument()
  })

  it('keeps the dialog open and says so when going back to the default fails', async () => {
    const user = userEvent.setup()
    fakeApi({
      session: makeSession(),
      template: { header: '<h1>NOSSO CONTRATO</h1>', clauses: '<p>Cláusula nossa.</p>', footer: '' },
      handlers: { 'DELETE /api/contract-template': () => json({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }, 500) },
    })
    renderRoute('/app/contratos/modelo')

    await user.click(await screen.findByRole('button', { name: 'Voltar ao padrão' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Voltar ao modelo padrão?' })
    await user.click(within(dialog).getByRole('button', { name: 'Voltar ao padrão' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Não foi possível salvar agora.')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(editor('Cabeçalho').innerHTML).toBe('<h1>NOSSO CONTRATO</h1>')
  })

  it('previews the contract with example data, leaving an unknown token as typed', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession() })
    renderRoute('/app/contratos/modelo')

    await screen.findByRole('textbox', { name: 'Cláusulas' })
    write('Cláusulas', '<p>{{locador}} loca a {{locatario}} o imóvel {{imovel}} por {{valor_mensal}}. {{locadro}}</p>')
    await user.click(screen.getByRole('radio', { name: 'Prévia' }))

    const page = screen.getByRole('article', { name: 'Prévia do contrato' })
    expect(page).toHaveTextContent('Maria Oliveira loca a Ana Carolina Souza o imóvel Apartamento Centro por R$ 3.800,00. {{locadro}}')
    expect(page).toHaveTextContent('CONTRATO DE LOCAÇÃO')
    expect(screen.queryByRole('textbox', { name: 'Cláusulas' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Editar' }))
    expect(editor('Cláusulas').innerHTML).toContain('{{locadro}}')
  })

  it('discards what was typed and starts over from the saved text', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession() })
    renderRoute('/app/contratos/modelo')

    await screen.findByRole('textbox', { name: 'Rodapé' })
    write('Rodapé', '<p>Outro rodapé</p>')
    expect(saveButton()).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Descartar alterações' }))

    expect(editor('Rodapé').innerHTML).toBe(DEFAULT_TEMPLATE.footer)
    expect(saveButton()).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Descartar alterações' })).not.toBeInTheDocument()
  })

  it('goes back to the default template after confirming', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      session: makeSession(),
      template: { header: '<h1>NOSSO CONTRATO</h1>', clauses: '<p>Cláusula nossa.</p>', footer: '' },
    })
    renderRoute('/app/contratos/modelo')

    expect(await screen.findByText(/Modelo da organização, salvo em/)).toBeInTheDocument()
    expect(editor('Cabeçalho').innerHTML).toBe('<h1>NOSSO CONTRATO</h1>')

    await user.click(screen.getByRole('button', { name: 'Voltar ao padrão' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Voltar ao modelo padrão?' })
    expect(dialog).toHaveTextContent('Os PDFs já gerados não mudam')
    await user.click(within(dialog).getByRole('button', { name: 'Voltar ao padrão' }))

    expect(await screen.findByText(/Este é o modelo padrão/)).toBeInTheDocument()
    expect(editor('Cabeçalho').innerHTML).toBe(DEFAULT_TEMPLATE.header)
    expect(api.calls.some((call) => call.method === 'DELETE' && call.path === '/api/contract-template')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Voltar ao padrão' })).not.toBeInTheDocument()
  })

  it('lets a member read and preview the template but not change it', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession({ memberRole: 'member' }) })
    renderRoute('/app/contratos/modelo')

    expect(await screen.findByText(/Só donos e administradores editam o modelo/)).toBeInTheDocument()
    for (const name of ['Cabeçalho', 'Cláusulas', 'Rodapé']) expect(editor(name)).toHaveAttribute('aria-disabled', 'true')
    expect(within(screen.getByRole('toolbar', { name: 'Formatação de cláusulas' })).getByRole('button', { name: 'Negrito' })).toBeDisabled()
    expect(within(screen.getByRole('complementary', { name: 'Marcadores' })).getAllByRole('button')[0]).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Salvar modelo/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Prévia' }))
    expect(screen.getByRole('article', { name: 'Prévia do contrato' })).toBeInTheDocument()
  })

  it('does not offer to go back to the default while an admin is seeing the app as someone else', async () => {
    fakeApi({
      session: makeSession({ impersonatedById: 'admin-1' }),
      template: { header: '<h1>NOSSO CONTRATO</h1>', clauses: '<p>Cláusula nossa.</p>', footer: '' },
    })
    renderRoute('/app/contratos/modelo')

    await screen.findByText(/Modelo da organização, salvo em/)
    expect(screen.queryByRole('button', { name: 'Voltar ao padrão' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Cláusulas' })).not.toHaveAttribute('aria-disabled')
  })
})

describe('Ways to the template', { timeout: 20_000 }, () => {
  it('links to it from the contract list and from the contract that makes the PDF', async () => {
    const property = makePropertyRecord()
    const contract = makeContract({ propertyId: property.id })
    fakeApi({ session: makeSession(), properties: [property], contracts: [contract] })
    const { router } = renderRoute('/app/contratos')

    const link = await screen.findByRole('link', { name: 'Modelo do contrato' })
    expect(link).toHaveAttribute('href', '/app/contratos/modelo')

    await router.navigate({ to: '/app/contratos/$contractId', params: { contractId: contract.id } })
    expect(await screen.findByRole('link', { name: 'Editar o modelo' })).toHaveAttribute('href', '/app/contratos/modelo')
  })
})
