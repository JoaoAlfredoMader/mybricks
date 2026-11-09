import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeApi, json, makeCashFlow, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

// Intl separates the currency sign with a no-break space.
const plain = (value: string | null | undefined) => value?.replace(/ /g, ' ')

const FIGURES = {
  '2026-01': { rent: 2_400_000, reservations: 160_000, fixed: 500_000, expenseTransactions: 385_000 },
  '2026-02': { rent: 2_400_000, fixed: 500_000, expenseTransactions: 385_000 },
  '2026-03': { rent: 2_400_000, revenueTransactions: 500_000, fixed: 500_000, expenseTransactions: 1_285_000 },
}

function months() {
  return screen.getAllByRole('img').filter((element) => element.tagName.toLowerCase() === 'rect')
}

describe('Cash flow chart', { timeout: 20_000 }, () => {
  // The windows are read from the viewer's calendar; only the date is frozen, timers keep running.
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 5) }))
  afterEach(() => vi.useRealTimers())

  it('adds up the window, draws a month per column and describes each one', async () => {
    const api = fakeApi({
      session: makeSession(),
      handlers: { 'GET /api/kpis/cash-flow': () => json(makeCashFlow('2026-01', '2026-03', FIGURES)) },
    })
    renderRoute('/app/financas')

    const section = (await screen.findByRole('heading', { level: 2, name: 'Fluxo de caixa' })).closest('section')!
    expect(await within(section).findByText('jan/2026 a mar/2026')).toBeInTheDocument()
    expect(plain(within(section).getByText('Receitas', { selector: 'dt' }).parentElement!.textContent)).toContain('R$ 78,6 mil')
    expect(plain(within(section).getByText('Despesas', { selector: 'dt' }).parentElement!.textContent)).toContain('R$ 35,6 mil')

    expect(months()).toHaveLength(3)
    expect(plain(months()[0]!.getAttribute('aria-label'))).toBe(
      'janeiro de 2026: receitas R$ 25.600,00, despesas R$ 8.850,00, resultado R$ 16.750,00',
    )
    const first = api.callsTo('/api/kpis/cash-flow')[0]!
    expect([first.query.get('from'), first.query.get('to'), first.query.has('propertyId')]).toEqual(['2025-12', '2026-11', false])
  })

  it('shows every series of a month on focus, with what makes up each one, and hides it on blur', async () => {
    fakeApi({
      session: makeSession(),
      handlers: { 'GET /api/kpis/cash-flow': () => json(makeCashFlow('2026-01', '2026-03', FIGURES)) },
    })
    renderRoute('/app/financas')

    await screen.findByRole('heading', { level: 2, name: 'Fluxo de caixa' })
    await waitFor(() => expect(months()).toHaveLength(3))
    fireEvent.focus(months()[2]!)

    const tip = await screen.findByText('março de 2026', { selector: 'p' })
    const readout = plain(tip.parentElement!.textContent)!
    expect(readout).toContain('ReceitasR$ 29.000,00')
    expect(readout).toContain('AluguelR$ 24.000,00')
    expect(readout).toContain('LançamentosR$ 5.000,00')
    expect(readout).toContain('DespesasR$ 17.850,00')
    expect(readout).toContain('Despesas fixasR$ 5.000,00')
    expect(readout).toContain('ResultadoR$ 11.150,00')
    expect(readout).not.toContain('Reservas')

    fireEvent.blur(months()[2]!)
    await waitFor(() => expect(screen.queryByText('março de 2026', { selector: 'p' })).not.toBeInTheDocument())
  })

  it('has the same figures as a table, with the totals, and goes back to the chart', async () => {
    const user = userEvent.setup()
    fakeApi({
      session: makeSession(),
      handlers: { 'GET /api/kpis/cash-flow': () => json(makeCashFlow('2026-01', '2026-03', FIGURES)) },
    })
    renderRoute('/app/financas')

    await user.click(await screen.findByRole('button', { name: 'Ver como tabela' }))
    expect(screen.getByRole('button', { name: 'Ver como gráfico', pressed: true })).toBeInTheDocument()
    const table = screen.getByRole('table', { name: /Receitas, despesas e resultado por mês, de jan\/2026 a mar\/2026/ })
    const rows = within(table).getAllByRole('row').map((row) => [...row.querySelectorAll('th, td')].map((cell) => plain(cell.textContent)))
    expect(rows[1]).toEqual(['jan/2026', 'R$ 24.000,00', 'R$ 1.600,00', 'R$ 0,00', 'R$ 25.600,00', 'R$ 5.000,00', 'R$ 3.850,00', 'R$ 8.850,00', 'R$ 16.750,00'])
    expect(rows.at(-1)).toEqual(['Total', 'R$ 72.000,00', 'R$ 1.600,00', 'R$ 5.000,00', 'R$ 78.600,00', 'R$ 15.000,00', 'R$ 20.550,00', 'R$ 35.550,00', 'R$ 43.050,00'])

    await user.click(screen.getByRole('button', { name: 'Ver como gráfico' }))
    expect(screen.queryByRole('table', { name: /Receitas, despesas e resultado/ })).not.toBeInTheDocument()
    expect(months()).toHaveLength(3)
  })

  it('keeps the chosen window in the URL and asks the API for those months', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession() })
    const { router } = renderRoute('/app/financas')

    await screen.findByRole('radio', { name: 'Este ano' })
    await user.click(screen.getByRole('radio', { name: 'Este ano' }))
    await waitFor(() => expect(router.state.location.search).toEqual({ flow: 'this-year' }))
    await waitFor(() => {
      const last = api.callsTo('/api/kpis/cash-flow').at(-1)!
      expect([last.query.get('from'), last.query.get('to')]).toEqual(['2026-01', '2026-12'])
    })
    await waitFor(() => expect(months()).toHaveLength(12))

    await user.click(screen.getByRole('radio', { name: 'Últimos 12 meses' }))
    await waitFor(() => expect(router.state.location.search).toEqual({}))
  })

  it('says so when nothing happened in the window, and offers a retry when the API fails', async () => {
    const user = userEvent.setup()
    let fail = true
    fakeApi({
      session: makeSession(),
      handlers: {
        'GET /api/kpis/cash-flow': () =>
          fail ? json({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }, 500) : json(makeCashFlow('2025-12', '2026-11')),
      },
    })
    renderRoute('/app/financas')

    const alert = await screen.findByRole('alert', {}, { timeout: 8000 })
    expect(alert).toHaveTextContent('Não foi possível carregar o fluxo de caixa.')
    fail = false
    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Sem receitas nem despesas neste período.')).toBeInTheDocument()
  })
})

describe('Cash flow of one property', { timeout: 20_000 }, () => {
  it('asks for that property alone and says it is the property as a whole', async () => {
    const centro = makePropertyRecord()
    const api = fakeApi({ session: makeSession(), properties: [centro] })
    renderRoute(`/app/imoveis/${centro.id}`)

    const section = (await screen.findByRole('heading', { level: 2, name: 'Fluxo de caixa' })).closest('section')!
    expect(within(section).getByText('Receitas e despesas deste imóvel, mês a mês.')).toBeInTheDocument()
    expect(section).not.toHaveTextContent('uso próprio')
    await waitFor(() => expect(api.callsTo('/api/kpis/cash-flow').length).toBeGreaterThan(0))
    expect(api.callsTo('/api/kpis/cash-flow')[0]!.query.get('propertyId')).toBe(centro.id)
  })

  it('keeps its own window apart from the URL', async () => {
    const user = userEvent.setup()
    const centro = makePropertyRecord()
    const api = fakeApi({ session: makeSession(), properties: [centro] })
    const { router } = renderRoute(`/app/imoveis/${centro.id}`)

    await user.click(await screen.findByRole('radio', { name: 'Ano passado' }))
    await waitFor(() => {
      const last = api.callsTo('/api/kpis/cash-flow').at(-1)!
      expect(last.query.get('from')).toMatch(/-01$/)
      expect(last.query.get('to')).toMatch(/-12$/)
    })
    expect(router.state.location.search).toEqual({})
  })
})

describe('Cash flow of the portfolio', () => {
  it('says that own use and loan for use are left out', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app/financas')

    const section = (await screen.findByRole('heading', { level: 2, name: 'Fluxo de caixa' })).closest('section')!
    expect(section).toHaveTextContent('Imóveis de uso próprio e comodato ficam de fora, como no painel.')
  })
})
