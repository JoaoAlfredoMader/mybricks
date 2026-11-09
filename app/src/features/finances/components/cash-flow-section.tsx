import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { ChartColumn, Table2 } from 'lucide-react'
import { useState } from 'react'
import { ChoiceGroup } from '@/components/form/choice-group'
import { StatTile } from '@/components/stat-tile'
import { Button } from '@/components/ui/button'
import { formatCompactMoney } from '@/lib/format'
import { cashFlowQueryOptions } from '../api/queries'
import { monthAbbreviated } from '../lib/chart'
import { FLOW_WINDOW_LABEL, type FlowWindow } from '../lib/period'
import { CashFlowChart, Legend } from './cash-flow-chart'
import { CashFlowTable } from './cash-flow-table'

const WINDOW_OPTIONS = (Object.keys(FLOW_WINDOW_LABEL) as FlowWindow[]).map((value) => ({ value, label: FLOW_WINDOW_LABEL[value] }))

interface CashFlowSectionProps {
  /** One property as a whole; without it, the whole portfolio. */
  propertyId?: string
  /** Where the window is kept: in the URL on the Finanças page, in the component's own state elsewhere. */
  window?: FlowWindow
  onWindowChange?: (window: FlowWindow) => void
  /** The three figures above the chart. Off where the page already leads with its own figures (the dashboard). */
  summary?: boolean
  className?: string
}

/**
 * Revenue and expenses month by month. The period picker sits above everything it scopes (the three
 * figures and the chart), and while another window loads the previous one stays on screen, dimmed.
 */
export function CashFlowSection({ propertyId, window: given, onWindowChange, summary = true, className }: CashFlowSectionProps) {
  const [own, setOwn] = useState<FlowWindow>('last-12-months')
  const window = given ?? own
  const flow = useQuery(cashFlowQueryOptions(window, propertyId))
  const [asTable, setAsTable] = useState(false)
  const data = flow.data
  const empty = data !== undefined && data.totals.revenueCents === 0 && data.totals.expensesCents === 0

  return (
    <section aria-labelledby="cash-flow-title" className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id="cash-flow-title" className="font-semibold">
            Fluxo de caixa
          </h2>
          <p className="text-sm text-muted-foreground">
            {propertyId ? 'Receitas e despesas deste imóvel, mês a mês.' : 'Receitas e despesas da carteira, mês a mês.'}
          </p>
        </div>
        <ChoiceGroup
          label="Período do gráfico"
          value={window}
          options={WINDOW_OPTIONS}
          onChange={(next) => (onWindowChange ?? setOwn)(next)}
        />
      </div>

      {flow.isError && !data ? (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar o fluxo de caixa.
          <Button variant="outline" size="sm" onClick={() => flow.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <div aria-busy={flow.isFetching} className={cn('transition-opacity', flow.isPlaceholderData && 'opacity-60')}>
          {summary && (
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatTile
                label="Receitas"
                value={data ? formatCompactMoney(data.totals.revenueCents, { digits: 1 }) : '—'}
                hint={data ? `${monthAbbreviated(data.from)} a ${monthAbbreviated(data.to)}` : undefined}
              />
              <StatTile
                label="Despesas"
                value={data ? formatCompactMoney(data.totals.expensesCents, { digits: 1 }) : '—'}
                hint="Fixas e lançamentos"
              />
              <StatTile
                className="col-span-2 sm:col-span-1"
                label="Resultado"
                value={data ? formatCompactMoney(data.totals.netCents, { digits: 1 }) : '—'}
                hint="Receitas menos despesas"
              />
            </dl>
          )}

          <div className="mt-4 rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Legend />
              <Button variant="ghost" size="sm" aria-pressed={asTable} onClick={() => setAsTable((value) => !value)}>
                {asTable ? <ChartColumn aria-hidden="true" /> : <Table2 aria-hidden="true" />}
                {asTable ? 'Ver como gráfico' : 'Ver como tabela'}
              </Button>
            </div>

            <div className="mt-4">
              {!data ? (
                <p className="py-16 text-center text-sm text-muted-foreground">Carregando o fluxo de caixa…</p>
              ) : asTable ? (
                <CashFlowTable data={data} />
              ) : (
                <>
                  {empty && <p className="mb-2 text-sm text-muted-foreground">Sem receitas nem despesas neste período.</p>}
                  <CashFlowChart data={data} />
                </>
              )}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              É o caixa de cada mês: o aluguel que valia em cada mês (vezes a ocupação esperada), as reservas no mês do check-in e
              os lançamentos nos meses em que acontecem, menos as despesas fixas do ano divididas por 12. Por isso a receita de 12
              meses não é igual à "Receita anual" do painel, que anualiza o aluguel de hoje.
              {!propertyId && ' Imóveis de uso próprio e comodato ficam de fora, como no painel.'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
