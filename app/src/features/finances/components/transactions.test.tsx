import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, makePropertyRecord, makeSession, makeTransaction } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

// Intl separates the currency sign with a no-break space.
const plain = (value: string | null | undefined) => value?.replace(/ /g, ' ')

function rows() {
  return within(screen.getByRole('region', { name: 'Lista de lançamentos' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => plain(cell.textContent)).join(' | '))
}

describe('Transaction list', { timeout: 20_000 }, () => {
  // "Este ano" is read from the viewer's calendar; only the date is frozen, timers keep running.
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 5) }))
  afterEach(() => vi.useRealTimers())

  it('lists the transactions, latest first, with the sign their type gives them', async () => {
    fakeApi({
      session: makeSession(),
      transactions: [
        makeTransaction({ categoryId: 6, categoryName: 'Parcela de financiamento', amountCents: 385_000, occurredOn: '2021-06-13', description: null, isRecurring: true }),
        makeTransaction(),
        makeTransaction({ categoryId: 4, categoryName: 'Indenização', type: 'revenue', amountCents: 500_000, occurredOn: '2026-09-25', propertyName: 'Flat Beira-Mar', description: null, isRecurring: true, recurrenceEndsOn: '2027-03-25' }),
      ],
    })
    renderRoute('/app/financas')

    expect(await screen.findByRole('heading', { level: 1, name: 'Finanças' })).toBeInTheDocument()
    expect(rows()).toEqual([
      '23/10/2026 | ReformaPintura geral | Apartamento Centro | Avulso | Despesa | − R$ 12.000,00',
      '25/09/2026 | Indenização | Flat Beira-Mar | Mensal até 25/03/2027 | Receita | + R$ 5.000,00',
      '13/06/2021 | Parcela de financiamento | Apartamento Centro | Mensal, sem data para acabar | Despesa | − R$ 3.850,00',
    ])
    expect(screen.getByRole('link', { name: 'Reforma' })).toHaveAttribute('href', expect.stringMatching(/^\/app\/financas\/[\w-]+\/editar$/))
    expect(screen.getByRole('link', { name: 'Finanças', current: 'page' })).toBeInTheDocument()
  })

  it('narrows the categories to the chosen type and sends the period as dates', async () => {
    const user = userEvent.setup()
    const api = fakeApi({
      session: makeSession(),
      transactions: [makeTransaction(), makeTransaction({ categoryId: 4, categoryName: 'Indenização', type: 'revenue' })],
    })
    const { router } = renderRoute('/app/financas')

    await screen.findByRole('heading', { level: 1, name: 'Finanças' })
    await user.click(screen.getByRole('combobox', { name: 'Tipo' }))
    await user.click(await screen.findByRole('option', { name: 'Despesas' }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(router.state.location.search).toEqual({ type: 'expense' })

    await user.click(screen.getByRole('combobox', { name: 'Categoria' }))
    const options = (await screen.findAllByRole('option')).map((option) => option.textContent)
    expect(options).toEqual(['Todas as categorias', 'Obra', 'Parcela de financiamento', 'Reforma'])
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('combobox', { name: 'Período' }))
    await user.click(await screen.findByRole('option', { name: 'Este ano' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ type: 'expense', period: 'this-year' }))
    const last = api.callsTo('/api/transactions').at(-1)!
    expect([last.query.get('from'), last.query.get('to'), last.query.get('type')]).toEqual(['2026-01-01', '2026-12-31', 'expense'])
  })

  it('keeps a monthly transaction that started before the period while it is still running', async () => {
    const user = userEvent.setup()
    fakeApi({
      session: makeSession(),
      transactions: [
        makeTransaction({ categoryId: 6, categoryName: 'Parcela de financiamento', occurredOn: '2021-06-13', description: null, isRecurring: true }),
        makeTransaction({ categoryId: 8, categoryName: 'Obra', occurredOn: '2022-01-10', description: null, isRecurring: true, recurrenceEndsOn: '2023-06-10' }),
        makeTransaction({ occurredOn: '2025-03-01', description: null }),
      ],
    })
    renderRoute('/app/financas')

    await screen.findByRole('heading', { level: 1, name: 'Finanças' })
    await user.click(screen.getByRole('combobox', { name: 'Período' }))
    await user.click(await screen.findByRole('option', { name: 'Este ano' }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(rows()[0]).toContain('Parcela de financiamento')
    expect(rows()[0]).toContain('Mensal, sem data para acabar')
  })

  it('says so when there is nothing to list', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app/financas')

    expect(await screen.findByText('Nenhum lançamento ainda')).toBeInTheDocument()
  })

  it('filters by category, property and recurrence, and drops a category that does not fit a newly chosen type', async () => {
    const user = userEvent.setup()
    const casa = makePropertyRecord({ name: 'Casa de Praia' })
    const api = fakeApi({
      session: makeSession(),
      properties: [casa],
      transactions: [makeTransaction({ propertyId: casa.id, propertyName: 'Casa de Praia' }), makeTransaction({ propertyId: '00000000-0000-4000-8000-000000000099', categoryId: 4, categoryName: 'Indenização', type: 'revenue', isRecurring: true })],
    })
    const { router } = renderRoute('/app/financas')
    const lastQuery = () => api.callsTo('/api/transactions').at(-1)!.query

    await screen.findByRole('heading', { level: 1, name: 'Finanças' })
    await user.click(screen.getByRole('combobox', { name: 'Categoria' }))
    await user.click(await screen.findByRole('option', { name: 'Reforma' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ categoryId: 7 }))
    expect(lastQuery().get('categoryId')).toBe('7')

    // Reforma is an expense: asking for revenues drops it instead of listing nothing.
    await user.click(screen.getByRole('combobox', { name: 'Tipo' }))
    await user.click(await screen.findByRole('option', { name: 'Receitas' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ type: 'revenue' }))

    await user.click(screen.getByRole('combobox', { name: 'Tipo' }))
    await user.click(await screen.findByRole('option', { name: 'Receitas e despesas' }))
    await waitFor(() => expect(router.state.location.search).toEqual({}))

    await user.click(screen.getByRole('combobox', { name: 'Imóvel' }))
    await user.click(await screen.findByRole('option', { name: 'Casa de Praia' }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(lastQuery().get('propertyId')).toBe(casa.id)

    await user.click(screen.getByRole('combobox', { name: 'Imóvel' }))
    await user.click(await screen.findByRole('option', { name: 'Todos os imóveis' }))
    await user.click(screen.getByRole('combobox', { name: 'Recorrência' }))
    await user.click(await screen.findByRole('option', { name: 'Recorrentes' }))
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(rows()[0]).toContain('Indenização')
    expect(lastQuery().get('isRecurring')).toBe('true')
  })

  it('offers to clear the filters when nothing matches them', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), transactions: [makeTransaction()] })
    const { router } = renderRoute('/app/financas?type=revenue')

    expect(await screen.findByText('Nenhum lançamento encontrado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(router.state.location.search).toEqual({})
  })

  it('pages through twenty at a time', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession(), transactions: Array.from({ length: 21 }, () => makeTransaction()) })
    const { router } = renderRoute('/app/financas')

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
