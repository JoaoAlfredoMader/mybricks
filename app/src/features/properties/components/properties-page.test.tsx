import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

const plain = (value: string | null | undefined) => value?.replace(/ /g, ' ')

function portfolio() {
  return [
    makePropertyRecord({ name: 'Apartamento Centro' }),
    makePropertyRecord({
      name: 'Galpão Anhanguera',
      propertyType: 'logistics',
      subtypeId: 9,
      privateArea: 2200,
      estimatedValueCents: 280_000_000,
      address: null,
    }),
    makePropertyRecord({ name: 'Casa de Praia', subtypeId: 2, usageType: 'own_use', status: 'own_use', estimatedValueCents: null }),
  ]
}

function rowNames() {
  return within(screen.getByRole('table'))
    .getAllByRole('rowheader')
    .map((cell) => within(cell).getByRole('link').textContent)
}

describe('Properties list', () => {
  it('lists the properties by name with type, usage, status, area and value', async () => {
    fakeApi({ session: makeSession(), properties: portfolio() })
    renderRoute('/app/imoveis')

    expect(await screen.findByRole('heading', { level: 1, name: 'Imóveis' })).toBeInTheDocument()
    expect(screen.getByText('3 imóveis')).toBeInTheDocument()
    expect(rowNames()).toEqual(['Apartamento Centro', 'Casa de Praia', 'Galpão Anhanguera'])

    const galpao = screen.getByRole('row', { name: /Galpão Anhanguera/ })
    const cells = within(galpao).getAllByRole('cell').map((cell) => plain(cell.textContent))
    expect(cells).toEqual(['LogísticoGalpão logístico', 'Locação', 'Alugado', '2.200 m²', 'R$ 2.800.000'])
    expect(within(galpao).getByRole('link')).toHaveAttribute('href', expect.stringMatching(/^\/app\/imoveis\/0{8}-/))

    const casa = screen.getByRole('row', { name: /Casa de Praia/ })
    expect(within(casa).getAllByRole('cell').at(-1)).toHaveTextContent('—')
    expect(within(casa).getByRole('rowheader')).toHaveTextContent('São Paulo, SP')
  })

  it('tags the properties that are for sale', async () => {
    fakeApi({
      session: makeSession(),
      properties: [
        makePropertyRecord({ name: 'Apartamento Centro' }),
        makePropertyRecord({
          name: 'Casa de Praia',
          forSale: { priceCents: 90_000_000, consentedAt: '2026-11-01T15:00:00.000Z', status: 'live', missing: [] },
        }),
      ],
    })
    renderRoute('/app/imoveis')

    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1)
    expect(within(rows[0]!).queryByText('À venda')).not.toBeInTheDocument()
    expect(within(rows[1]!).getByText('À venda')).toBeInTheDocument()
  })

  it('searches by name a moment after typing, and keeps it in the URL', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession(), properties: portfolio() })
    const { router } = renderRoute('/app/imoveis')

    await user.type(await screen.findByRole('searchbox', { name: 'Buscar pelo nome' }), 'casa')

    await waitFor(() => expect(rowNames()).toEqual(['Casa de Praia']))
    expect(router.state.location.search).toEqual({ search: 'casa' })
    expect(screen.getByText('1 imóvel com estes filtros')).toBeInTheDocument()
    const searched = api.callsTo('/api/properties').map((call) => call.query.get('search'))
    expect(searched).toEqual([null, 'casa'])
  })

  it('filters by type and usage', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), properties: portfolio() })
    const { router } = renderRoute('/app/imoveis')

    async function pick(filter: string, option: string) {
      await user.click(screen.getByRole('combobox', { name: filter }))
      await user.click(await screen.findByRole('option', { name: option }))
    }

    await screen.findByRole('table')
    await pick('Tipo', 'Logístico')
    await waitFor(() => expect(rowNames()).toEqual(['Galpão Anhanguera']))
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveTextContent('Logístico')

    await pick('Tipo', 'Todos os tipos')
    await pick('Uso', 'Uso próprio')
    await waitFor(() => expect(rowNames()).toEqual(['Casa de Praia']))
    expect(router.state.location.search).toEqual({ usageType: 'own_use' })
  })

  it('offers to clear the filters when nothing matches', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), properties: portfolio() })
    renderRoute('/app/imoveis?search=%22mansao%22')

    expect(await screen.findByText('Nenhum imóvel encontrado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => expect(rowNames()).toHaveLength(3))
    expect(screen.getByRole('searchbox', { name: 'Buscar pelo nome' })).toHaveValue('')
  })

  it('pages through more than twenty properties', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 23 }, (_, i) => makePropertyRecord({ name: `Imóvel ${String(i + 1).padStart(2, '0')}` }))
    fakeApi({ session: makeSession(), properties: many })
    const { router } = renderRoute('/app/imoveis')

    const pages = await screen.findByRole('navigation', { name: 'Páginas' })
    expect(within(pages).getByText('1–20 de 23')).toBeInTheDocument()
    expect(within(pages).getByRole('button', { name: 'Anterior' })).toBeDisabled()

    await user.click(within(pages).getByRole('button', { name: 'Próxima' }))

    await waitFor(() => expect(rowNames()).toEqual(['Imóvel 21', 'Imóvel 22', 'Imóvel 23']))
    expect(within(pages).getByText('21–23 de 23')).toBeInTheDocument()
    expect(within(pages).getByRole('button', { name: 'Próxima' })).toBeDisabled()
    expect(router.state.location.search).toEqual({ page: 2 })
  })

  it('ignores a malformed filter in the URL', async () => {
    fakeApi({ session: makeSession(), properties: portfolio() })
    renderRoute('/app/imoveis?propertyType=%22castle%22&page=%22x%22')

    await waitFor(() => expect(rowNames()).toHaveLength(3))
  })

  it('marks the section in the sidebar', async () => {
    fakeApi({ session: makeSession(), properties: portfolio() })
    renderRoute('/app/imoveis')

    const nav = await screen.findByRole('navigation', { name: 'Seções' })
    await waitFor(() => expect(within(nav).getByRole('link', { name: 'Imóveis' })).toHaveAttribute('data-status', 'active'))
    expect(within(nav).getByRole('link', { name: 'Painel' })).not.toHaveAttribute('data-status', 'active')
  })
})
