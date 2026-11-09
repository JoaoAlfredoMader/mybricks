import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeApi, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

/**
 * jsdom's FormData and File cannot travel in Node's Request, so in these tests an upload
 * goes to the fake API as JSON describing the file. The multipart request itself is
 * covered against the real API in the browser.
 */
vi.mock('../api/files', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/files')>()
  async function post(path: string, fields: Record<string, unknown>) {
    const response = await fetch(new Request(new URL(path, location.origin), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(fields),
    }))
    if (!response.ok) throw new Error(`upload failed: ${response.status}`)
    return response.json()
  }
  const describe = (file: File) => ({ name: file.name, type: file.type, size: file.size })
  return {
    ...actual,
    uploadPhoto: (propertyId: string, file: File) => post(`/api/properties/${propertyId}/photos`, { file: describe(file) }),
    uploadDocument: (propertyId: string, file: File, category: string | null) =>
      post(`/api/properties/${propertyId}/documents`, { file: describe(file), ...(category ? { category } : {}) }),
  }
})

const png = (name: string) => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: 'image/png' })
const pdf = (name: string) => new File(['%PDF-1.4'], name, { type: 'application/pdf' })

function photo(propertyId: string, id: string, position: number) {
  return {
    id,
    propertyId,
    position,
    fileName: `${id}.png`,
    mimeType: 'image/png',
    sizeBytes: 1000,
    contentUrl: `/api/properties/${propertyId}/photos/${id}/content`,
    createdAt: '2026-11-04T12:00:00.000Z',
  }
}

function photoAlts() {
  return within(screen.getByRole('region', { name: 'Fotos' }))
    .queryAllByRole('img')
    .map((img) => img.getAttribute('alt'))
}

describe('Property photos', { timeout: 20_000 }, () => {
  it('uploads the chosen photos in order and refuses what is not an image', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const property = makePropertyRecord()
    const api = fakeApi({ session: makeSession(), properties: [property] })
    renderRoute(`/app/imoveis/${property.id}`)

    expect(await screen.findByText(/Nenhuma foto ainda/)).toBeInTheDocument()
    await user.upload(screen.getByLabelText('Adicionar fotos'), [png('sala.png'), new File(['x'], 'planta.txt', { type: 'text/plain' }), png('quarto.png')])

    await waitFor(() =>
      expect(photoAlts()).toEqual(['Apartamento Centro, foto 1 (capa)', 'Apartamento Centro, foto 2']),
    )
    expect(screen.getByText('2 de 30 · a primeira é a capa')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('"planta.txt" não é JPEG, PNG ou WebP.')
    const uploads = api.calls.filter((call) => call.method === 'POST' && call.path.endsWith('/photos'))
    expect(uploads.map((call) => (call.body as { file: File }).file.name)).toEqual(['sala.png', 'quarto.png'])
  })

  it('makes another photo the cover and removes one after confirming', async () => {
    const user = userEvent.setup()
    const property = makePropertyRecord()
    const api = fakeApi({
      session: makeSession(),
      properties: [property],
      photos: { [property.id]: [photo(property.id, 'a', 0), photo(property.id, 'b', 1), photo(property.id, 'c', 2)] },
    })
    renderRoute(`/app/imoveis/${property.id}`)

    await user.click(await screen.findByRole('button', { name: 'Usar foto 3 como capa' }))
    await waitFor(() => expect(api.calls.find((call) => call.method === 'PUT')?.body).toEqual({ photoIds: ['c', 'a', 'b'] }))
    expect(screen.getByRole('button', { name: 'Mover foto 1 para a esquerda' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Remover foto 2' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Remover esta foto?' })
    await user.click(within(dialog).getByRole('button', { name: 'Remover foto' }))

    await waitFor(() => expect(photoAlts()).toHaveLength(2))
    expect(api.calls.some((call) => call.method === 'DELETE' && call.path.endsWith('/photos/a'))).toBe(true)
  })
})

describe('Property documents', { timeout: 20_000 }, () => {
  it('sends a document with its category, renames it and removes it', async () => {
    const user = userEvent.setup()
    const property = makePropertyRecord()
    const api = fakeApi({ session: makeSession(), properties: [property] })
    renderRoute(`/app/imoveis/${property.id}`)

    await user.type(await screen.findByLabelText('Categoria do próximo documento'), 'Escritura')
    await user.upload(screen.getByLabelText('Enviar documento'), pdf('escritura.pdf'))

    const documents = screen.getByRole('region', { name: 'Documentos' })
    expect(await within(documents).findByText('escritura.pdf')).toBeInTheDocument()
    expect(within(documents).getByText(/Escritura · 1 KB/)).toBeInTheDocument()
    const upload = api.calls.find((call) => call.method === 'POST' && call.path.endsWith('/documents'))
    expect(upload?.body).toMatchObject({ category: 'Escritura' })
    expect(screen.getByLabelText('Categoria do próximo documento')).toHaveValue('')
    expect(within(documents).getByRole('link', { name: 'Baixar escritura.pdf' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/documents\/file-\d+\/content$/),
    )

    await user.click(within(documents).getByRole('button', { name: 'Mudar a categoria de escritura.pdf' }))
    const input = within(documents).getByLabelText('Categoria de escritura.pdf')
    await user.clear(input)
    await user.type(input, 'Matrícula{Enter}')
    expect(await within(documents).findByText(/Matrícula · 1 KB/)).toBeInTheDocument()

    await user.click(within(documents).getByRole('button', { name: 'Remover escritura.pdf' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remover documento' }))
    expect(await within(documents).findByText('Nenhum documento ainda.')).toBeInTheDocument()
  })

  it('refuses a file of another type before sending it', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const property = makePropertyRecord()
    const api = fakeApi({ session: makeSession(), properties: [property] })
    renderRoute(`/app/imoveis/${property.id}`)

    await user.upload(await screen.findByLabelText('Enviar documento'), new File(['oi'], 'notas.txt', { type: 'text/plain' }))

    expect(await screen.findByText('"notas.txt" não é PDF, imagem, DOCX ou XLSX.')).toBeInTheDocument()
    expect(api.calls.some((call) => call.method === 'POST')).toBe(false)
  })
})

describe('Deleting a property', { timeout: 20_000 }, () => {
  it('asks first, then removes it and goes back to the list', async () => {
    const user = userEvent.setup()
    const property = makePropertyRecord({ name: 'Casa de Praia' })
    const other = makePropertyRecord({ name: 'Kitnet' })
    const api = fakeApi({ session: makeSession(), properties: [property, other] })
    const { router } = renderRoute(`/app/imoveis/${property.id}`)

    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Excluir Casa de Praia?' })
    expect(dialog).toHaveTextContent('Não dá para desfazer.')

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(api.calls.some((call) => call.method === 'DELETE')).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Excluir imóvel' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/app/imoveis'))
    expect(await screen.findByText('1 imóvel')).toBeInTheDocument()
    expect(api.calls.filter((call) => call.path === `/api/properties/${property.id}` && call.method === 'GET')).toHaveLength(1)
  })

  it('offers no delete while an admin is seeing the app as someone else', async () => {
    const property = makePropertyRecord()
    fakeApi({
      session: makeSession({ impersonatedById: 'admin-1' }),
      properties: [property],
      photos: { [property.id]: [photo(property.id, 'a', 0)] },
    })
    renderRoute(`/app/imoveis/${property.id}`)

    await screen.findByRole('heading', { level: 1, name: 'Apartamento Centro' })
    await screen.findByRole('img', { name: /foto 1/ })
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remover foto 1' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar' })).toBeInTheDocument()
  })
})
