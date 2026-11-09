import { useQuery } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from 'cn'
import { formatAnnualPercent, formatDate, formatMoney, formatNumericDate, formatWholeMoney } from '@/lib/format'
import { financingScheduleQueryOptions, type FinancingSchedule, type Installment, type Property } from '../api/queries'
import { AMORTIZATION_LABEL } from '../lib/labels'

type Financing = NonNullable<Property['financing']>

const year = (installment: Installment) => installment.dueOn.slice(0, 4)

function Terms({ financing }: { financing: Financing }) {
  const items = [
    { label: 'Credor', value: financing.lender ?? '—' },
    { label: 'Valor financiado', value: formatWholeMoney(financing.financedAmountCents) },
    { label: 'Prazo', value: `${financing.termMonths} meses` },
    { label: 'Juros', value: formatAnnualPercent(financing.annualInterestRate) },
    { label: 'Amortização', value: AMORTIZATION_LABEL[financing.amortizationSystem] },
    { label: 'Primeira parcela', value: formatDate(financing.firstInstallmentOn) },
  ]
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
      {items.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/60 p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight tabular-nums">{value}</dd>
      <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>
    </div>
  )
}

function Progress({ paid, total }: { paid: number; total: number }) {
  const text = `${paid} de ${total}`
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span id="financing-progress" className="text-muted-foreground">
          Parcelas pagas
        </span>
        <span className="font-medium tabular-nums">{text}</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby="financing-progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={paid}
        aria-valuetext={text}
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-chart-1" style={{ width: `${total ? (paid / total) * 100 : 0}%` }} />
      </div>
    </div>
  )
}

function Summary({ schedule }: { schedule: FinancingSchedule }) {
  const { summary, asOf } = schedule
  const next = summary.nextInstallment
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryTile label="Saldo devedor" value={formatMoney(summary.outstandingBalanceCents)} hint={`Em ${formatDate(asOf)}`} />
      <SummaryTile
        label="Próxima parcela"
        value={next ? formatMoney(next.installmentCents) : 'Quitado'}
        hint={next ? `Nº ${next.number}, vence em ${formatNumericDate(next.dueOn)}` : 'Todas as parcelas já venceram'}
      />
      <SummaryTile
        label="Pago até agora"
        value={formatMoney(summary.totalPaidCents)}
        hint={summary.paidInstallments === 1 ? '1 parcela' : `${summary.paidInstallments} parcelas`}
      />
      <SummaryTile label="Juros do contrato" value={formatMoney(summary.totalInterestCents)} hint="Somando todas as parcelas" />
    </dl>
  )
}

const NUMERIC = 'px-3 py-2.5 text-right tabular-nums whitespace-nowrap'

function InstallmentStatus({ installment, schedule }: { installment: Installment; schedule: FinancingSchedule }) {
  if (installment.number <= schedule.summary.paidInstallments) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Check className="size-3.5" aria-hidden="true" />
        Paga
      </span>
    )
  }
  if (installment.number === schedule.summary.nextInstallment?.number) {
    return <span className="rounded-full bg-pastel-cyan px-2.5 py-1 text-xs font-medium text-foreground">Próxima</span>
  }
  return <span className="text-muted-foreground">A vencer</span>
}

function InstallmentTable({ schedule }: { schedule: FinancingSchedule }) {
  const years = [...new Set(schedule.installments.map(year))]
  const current = schedule.summary.nextInstallment?.dueOn.slice(0, 4) ?? years.at(-1) ?? ''
  const [picked, setPicked] = useState<string | null>(null)
  // After an edit the years may change; a year that is gone falls back to the current one.
  const shown = picked && years.includes(picked) ? picked : current
  const index = years.indexOf(shown)
  const rows = schedule.installments.filter((installment) => year(installment) === shown)

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-medium">Parcelas</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ano anterior"
            disabled={index <= 0}
            onClick={() => setPicked(years[index - 1]!)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Select<string> items={years.map((y) => ({ value: y, label: y }))} value={shown} onValueChange={(next) => next && setPicked(next)}>
            <SelectTrigger aria-label="Ano das parcelas" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próximo ano"
            disabled={index >= years.length - 1}
            onClick={() => setPicked(years[index + 1]!)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="-mx-5 mt-3 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">Parcelas com vencimento em {shown}</caption>
          <thead>
            <tr className="border-b text-xs whitespace-nowrap text-muted-foreground">
              <th scope="col" className="py-2.5 pr-3 pl-5 text-left font-medium sm:pl-6">Nº</th>
              <th scope="col" className="px-3 py-2.5 text-left font-medium">Vencimento</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Parcela</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Juros</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Amortização</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Saldo após</th>
              <th scope="col" className="py-2.5 pr-5 pl-3 text-left font-medium sm:pr-6">Situação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((installment) => {
              const isNext = installment.number === schedule.summary.nextInstallment?.number
              return (
                <tr
                  key={installment.number}
                  className={cn('border-b last:border-b-0', isNext && 'bg-muted/60 font-medium')}
                >
                  <th scope="row" className="py-2.5 pr-3 pl-5 text-left font-[inherit] tabular-nums sm:pl-6">
                    {installment.number}
                  </th>
                  <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">{formatNumericDate(installment.dueOn)}</td>
                  <td className={NUMERIC}>{formatMoney(installment.installmentCents)}</td>
                  <td className={NUMERIC}>{formatMoney(installment.interestCents)}</td>
                  <td className={NUMERIC}>{formatMoney(installment.amortizationCents)}</td>
                  <td className={NUMERIC}>{formatMoney(installment.balanceCents)}</td>
                  <td className="py-2.5 pr-5 pl-3 whitespace-nowrap sm:pr-6">
                    <InstallmentStatus installment={installment} schedule={schedule} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface FinancingSectionProps {
  propertyId: string
  financing: Financing
}

/** The financing's terms, where it stands and every installment, a year at a time. */
export function FinancingSection({ propertyId, financing }: FinancingSectionProps) {
  const schedule = useQuery(financingScheduleQueryOptions(propertyId))

  return (
    <section aria-labelledby="financing-title" className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 lg:col-span-2">
      <h2 id="financing-title" className="font-semibold">
        Financiamento
      </h2>
      <Terms financing={financing} />

      {schedule.isPending && <p className="mt-6 text-sm text-muted-foreground">Carregando as parcelas…</p>}
      {schedule.isError && (
        <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar as parcelas.
          <Button variant="outline" size="sm" onClick={() => schedule.refetch()}>
            Tentar de novo
          </Button>
        </div>
      )}
      {schedule.data && (
        <>
          <Progress paid={schedule.data.summary.paidInstallments} total={schedule.data.installments.length} />
          <Summary schedule={schedule.data} />
          <InstallmentTable schedule={schedule.data} />
        </>
      )}
    </section>
  )
}
