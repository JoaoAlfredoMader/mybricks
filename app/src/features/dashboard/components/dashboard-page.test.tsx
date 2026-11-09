import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, makeKpis, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

const plain = (value: string | null) => value?.replace(/ /g, ' ')

describe('Dashboard', () => {
  it('leads with the portfolio value and its rates, formatted from cents and fractions', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app')

    const summary = await screen.findByRole('region', { name: 'Resumo da carteira' })
    expect(plain(summary.textContent)).toContain('Valor da carteiraR$ 6,57 mi')
    expect(plain(summary.textContent)).toContain('R$ 5,92 mi em imóveis que geram renda · 3 imóveis')
    expect(plain(summary.textContent)).toContain('Receita anualR$ 384,7 mil')
    expect(plain(summary.textContent)).toContain('Yield bruto6,5%')
    expect(plain(summary.textContent)).toContain('Cap rate5,5%')
    expect(screen.getByText(/Indicadores de 4 de novembro de 2026/)).toBeInTheDocument()
  })

  it('splits the properties by status with counts, not colour alone', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app')

    const split = await screen.findByRole('region', { name: 'Imóveis por situação' })
    const rows = within(split).getAllByRole('listitem').map((row) => row.textContent)
    expect(rows).toEqual(['Alugados267%', 'Vagos00%', 'Uso próprio133%', 'Comodato00%'])
    expect(within(split).getByRole('img')).toHaveAccessibleName(
      'Alugados: 2 imóveis, Vagos: 0 imóveis, Uso próprio: 1 imóvel, Comodato: 0 imóveis',
    )
  })

  it('lists the properties from the highest value down, with a dash where a rate is missing', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app')

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual([
      'Galpão LogísticoLocação',
      'Casa de PraiaUso próprio · 50% seu · fora do rendimento',
      'Apartamento CentroLocação',
    ])
    const beach = within(rows[1]!).getAllByRole('cell').map((cell) => plain(cell.textContent))
    expect(beach).toEqual(['Uso próprio', 'R$ 950.000', 'R$ 0', '-R$ 8.000', '—', '—', '—Sem custo de aquisição'])
  })

  it('says so when there is no property yet', async () => {
    fakeApi({
      session: makeSession(),
      kpis: makeKpis({ propertyCount: 0, properties: [], propertiesByStatus: { rented: 0, vacant: 0, own_use: 0, loan_for_use: 0 } }),
    })
    renderRoute('/app')

    expect(await screen.findByText(/Nenhum imóvel cadastrado ainda/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('draws the portfolio cash flow under the summary, without repeating the dashboard\'s own figures', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession() })
    const { router } = renderRoute('/app')

    const section = (await screen.findByRole('heading', { level: 2, name: 'Fluxo de caixa' })).closest('section')!
    expect(within(section).getByText('Receitas e despesas da carteira, mês a mês.')).toBeInTheDocument()
    expect(within(section).getByRole('radio', { name: 'Últimos 12 meses' })).toBeChecked()
    // The three figures of the Finanças page would compete with the dashboard's own.
    expect(within(section).queryByText('Receitas menos despesas')).not.toBeInTheDocument()
    await waitFor(() => expect(api.callsTo('/api/kpis/cash-flow').length).toBeGreaterThan(0))
    expect(api.callsTo('/api/kpis/cash-flow')[0]!.query.has('propertyId')).toBe(false)

    await user.click(within(section).getByRole('radio', { name: 'Este ano' }))
    await waitFor(() => {
      const last = api.callsTo('/api/kpis/cash-flow').at(-1)!
      expect(last.query.get('from')).toMatch(/-01$/)
      expect(last.query.get('to')).toMatch(/-12$/)
    })
    expect(router.state.location.search).toEqual({})
  })

  it('leaves the cash flow out when there is no property yet', async () => {
    fakeApi({
      session: makeSession(),
      kpis: makeKpis({ propertyCount: 0, properties: [], propertiesByStatus: { rented: 0, vacant: 0, own_use: 0, loan_for_use: 0 } }),
    })
    renderRoute('/app')

    await screen.findByText(/Nenhum imóvel cadastrado ainda/)
    expect(screen.queryByRole('heading', { name: 'Fluxo de caixa' })).not.toBeInTheDocument()
  })

  it('shows no demo notice for a real portfolio', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app')

    await screen.findByText('Portfólio de Ana')
    expect(screen.queryByText(/carteira de exemplo/)).not.toBeInTheDocument()
  })
})
