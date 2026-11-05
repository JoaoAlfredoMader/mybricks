import { Clock } from 'lucide-react'
import type { ActiveOrganization } from '@/features/auth/api/organization'
import { ListingsShowcase } from '@/features/listings/components/listings-showcase'
import { CashFlowSection } from '@/features/finances/components/cash-flow-section'
import { formatCompactMoney, formatDate, formatRate, formatTimeUntil } from '@/lib/format'
import type { PortfolioKpis } from '../api/portfolio-kpis'
import { PropertiesTable } from './properties-table'
import { StatTile } from '@/components/stat-tile'
import { StatusSplit } from './status-split'

interface DashboardPageProps {
  kpis: PortfolioKpis
  organization: ActiveOrganization | null | undefined
}

function propertyCount(count: number) {
  return count === 1 ? '1 imóvel' : `${count} imóveis`
}

export function DashboardPage({ kpis, organization }: DashboardPageProps) {
  const { totals } = kpis

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Painel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Indicadores de {formatDate(kpis.asOf)}, ponderados pela sua participação em cada imóvel.
        </p>
      </header>

      {organization?.isDemo && organization.demoExpiresAt && (
        <p className="mt-5 flex items-start gap-2.5 rounded-2xl bg-pastel-yellow px-4 py-3 text-sm sm:items-center">
          <Clock className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden="true" />
          <span>
            Esta é uma carteira de exemplo, só sua. Ela será apagada {formatTimeUntil(organization.demoExpiresAt)}.
          </span>
        </p>
      )}

      <section aria-label="Resumo da carteira" className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col justify-between gap-6 rounded-2xl bg-pastel-lavender p-6">
          <div>
            <p className="text-sm text-muted-foreground">Valor da carteira</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight">{formatCompactMoney(totals.totalValueCents)}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCompactMoney(totals.incomeProducingValueCents)} em imóveis que geram renda ·{' '}
            {propertyCount(kpis.propertyCount)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <StatTile label="Receita anual" value={formatCompactMoney(totals.annualRevenueCents, { digits: 1 })} />
          <StatTile
            label="NOI anual"
            value={formatCompactMoney(totals.noiCents, { digits: 1 })}
            hint={`Despesas de ${formatCompactMoney(totals.annualExpensesCents, { digits: 1 })}`}
          />
          <StatTile label="Yield bruto" value={formatRate(totals.grossYield)} hint="Receita sobre o valor que gera renda" />
          <StatTile label="Cap rate" value={formatRate(totals.capRate)} hint="NOI sobre o valor que gera renda" />
        </dl>
      </section>

      {kpis.propertyCount > 0 && <CashFlowSection summary={false} className="mt-6" />}

      <section aria-labelledby="split-title" className="mt-4 rounded-2xl border bg-card p-5 sm:p-6">
        <h2 id="split-title" className="font-semibold">
          Imóveis por situação
        </h2>
        <div className="mt-5">
          <StatusSplit byStatus={kpis.propertiesByStatus} total={kpis.propertyCount} />
        </div>
      </section>

      <section aria-labelledby="properties-title" className="mt-4 rounded-2xl border bg-card p-5 sm:p-6">
        <h2 id="properties-title" className="font-semibold">
          Imóveis
        </h2>
        {kpis.properties.length > 0 ? (
          <div className="mt-3">
            <PropertiesTable properties={kpis.properties} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum imóvel cadastrado ainda. Os indicadores aparecem aqui assim que o primeiro for incluído.
          </p>
        )}
      </section>

      <ListingsShowcase variant="app" />
    </main>
  )
}
