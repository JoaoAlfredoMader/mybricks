import { useState } from 'react'
import { formatCompactMoney, formatMoney } from '@/lib/format'
import { useElementWidth } from '@/lib/use-element-width'
import type { CashFlow, CashFlowMonth } from '../api/queries'
import { columnPath, monthLong, monthShort, niceScale, SERIES, yFor } from '../lib/chart'

const LEFT = 56
const RIGHT = 64
const TOP = 12
const PLOT = 208
const AXIS = 40
const HEIGHT = TOP + PLOT + AXIS
const MAX_BAR = 24
const TOOLTIP_WIDTH = 232

/** What the screen reader says for one month: the same figures the tooltip shows. */
function describeMonth(month: CashFlowMonth) {
  return `${monthLong(month.month)}: receitas ${formatMoney(month.revenue.totalCents)}, despesas ${formatMoney(month.expenses.totalCents)}, resultado ${formatMoney(month.netCents)}`
}

function Key({ color }: { color: string }) {
  return <span aria-hidden="true" className="inline-block h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} />
}

function Detail({ label, cents }: { label: string; cents: number }) {
  if (cents === 0) return null
  return (
    <div className="flex justify-between gap-4 pl-5 text-xs text-muted-foreground">
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatMoney(cents)}</dd>
    </div>
  )
}

function Headline({ series, cents }: { series: keyof typeof SERIES; cents: number }) {
  const { label, color } = SERIES[series]
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <Key color={color} />
        {label}
      </dt>
      <dd className="text-sm font-semibold tabular-nums">{formatMoney(cents)}</dd>
    </div>
  )
}

/** The readout for one month: every series, the values first and the names after. */
function Tooltip({ month, left }: { month: CashFlowMonth; left: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-2 z-10 rounded-xl bg-popover p-3 text-popover-foreground shadow-lg shadow-slate-900/8 ring-1 ring-foreground/8"
      style={{ left, width: TOOLTIP_WIDTH }}
    >
      <p className="mb-2 text-xs font-medium">{monthLong(month.month)}</p>
      <dl className="grid gap-1">
        <Headline series="revenue" cents={month.revenue.totalCents} />
        <Detail label="Aluguel" cents={month.revenue.rentCents} />
        <Detail label="Reservas" cents={month.revenue.reservationsCents} />
        <Detail label="Lançamentos" cents={month.revenue.transactionsCents} />
        <Headline series="expense" cents={month.expenses.totalCents} />
        <Detail label="Despesas fixas" cents={month.expenses.fixedCents} />
        <Detail label="Lançamentos" cents={month.expenses.transactionsCents} />
        <Headline series="net" cents={month.netCents} />
      </dl>
    </div>
  )
}

/** The legend: it names the three series, and its keys mirror the marks (squares for bars, a line for the line). */
export function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
      {(['revenue', 'expense'] as const).map((series) => (
        <li key={series} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: SERIES[series].color }} />
          {SERIES[series].label}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="inline-flex items-center">
          <span className="h-0.5 w-3 rounded-full" style={{ background: SERIES.net.color }} />
          <span className="-ml-2 size-2 rounded-full ring-2 ring-card" style={{ background: SERIES.net.color }} />
        </span>
        {SERIES.net.label}
      </li>
    </ul>
  )
}

/**
 * Revenue and expenses as two columns per month, and the result as a line, all on one axis from
 * zero. Hovering or focusing a month shows every series; the same figures are in the table view.
 */
export function CashFlowChart({ data }: { data: CashFlow }) {
  const { ref, width } = useElementWidth()
  const [active, setActive] = useState<number | null>(null)

  const months = data.months
  const innerWidth = Math.max(width - LEFT - RIGHT, 1)
  const slot = innerWidth / months.length
  const scale = niceScale(
    Math.min(0, ...months.map((m) => m.netCents)),
    Math.max(0, ...months.map((m) => Math.max(m.revenue.totalCents, m.expenses.totalCents, m.netCents))),
  )
  const bottom = TOP + PLOT
  const baseline = yFor(0, scale, TOP, bottom)
  const barWidth = Math.max(3, Math.min(MAX_BAR, Math.floor((slot * 0.72 - 2) / 2)))
  const centers = months.map((_, i) => LEFT + slot * i + slot / 2)
  const ys = months.map((m) => yFor(m.netCents, scale, TOP, bottom))
  const line = months.map((_, i) => `${i === 0 ? 'M' : 'L'}${centers[i]!.toFixed(1)},${ys[i]!.toFixed(1)}`).join(' ')
  const labelEvery = slot < 34 ? 2 : 1
  const firstJanuary = months.findIndex((m) => m.month.endsWith('-01'))
  const firstLabel = firstJanuary >= 0 ? firstJanuary % labelEvery : 0
  const last = months.length - 1
  const current = active === null ? null : months[active]!
  const tooltipLeft = active === null ? 0 : Math.min(Math.max(centers[active]! - TOOLTIP_WIDTH / 2, 4), Math.max(width - TOOLTIP_WIDTH - 4, 4))

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setActive(null)}>
      <svg
        role="group"
        aria-label={`Fluxo de caixa de ${monthLong(months[0]!.month)} a ${monthLong(months[last]!.month)}: receitas, despesas e resultado por mês`}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="block max-w-full overflow-visible text-muted-foreground"
      >
        {scale.ticks.map((tick) => {
          const y = yFor(tick, scale, TOP, bottom)
          return (
            <g key={tick}>
              <line x1={LEFT} x2={width - RIGHT} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={LEFT - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="currentColor">
                {formatCompactMoney(tick, { digits: 1 })}
              </text>
            </g>
          )
        })}
        <line x1={LEFT} x2={width - RIGHT} y1={baseline} y2={baseline} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />

        {active !== null && (
          <g>
            <rect x={LEFT + slot * active} y={TOP} width={slot} height={PLOT} fill="var(--muted)" opacity={0.6} />
            <line x1={centers[active]} x2={centers[active]} y1={TOP} y2={bottom} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1} />
          </g>
        )}

        {months.map((month, i) => {
          const revenueHeight = baseline - yFor(month.revenue.totalCents, scale, TOP, bottom)
          const expenseHeight = baseline - yFor(month.expenses.totalCents, scale, TOP, bottom)
          return (
            <g key={month.month}>
              <path d={columnPath(centers[i]! - barWidth - 1, baseline, barWidth, revenueHeight)} fill={SERIES.revenue.color} />
              <path d={columnPath(centers[i]! + 1, baseline, barWidth, expenseHeight)} fill={SERIES.expense.color} />
            </g>
          )
        })}

        <path d={line} fill="none" stroke={SERIES.net.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {months.map((month, i) => (
          <circle key={month.month} cx={centers[i]} cy={ys[i]} r={4} fill={SERIES.net.color} stroke="var(--card)" strokeWidth={2} />
        ))}
        {/* The end of the line is labelled in the margin, clear of the columns. */}
        <text
          x={width - RIGHT + 8}
          y={ys[last]}
          dominantBaseline="middle"
          fontSize={11}
          fontWeight={600}
          fill="var(--foreground)"
        >
          {formatCompactMoney(months[last]!.netCents, { digits: 1 })}
        </text>

        {months.map((month, i) => {
          // When the labels are thinned, January is always one of them, and the year goes under the
          // first label and under every January, so two years never meet.
          const labelled = (i - firstLabel + labelEvery) % labelEvery === 0
          const showYear = labelled && (i === firstLabel || month.month.endsWith('-01'))
          return (
            <g key={month.month} fill="currentColor" fontSize={11} textAnchor="middle">
              {labelled && <text x={centers[i]} y={bottom + 16}>{monthShort(month.month)}</text>}
              {showYear && <text x={centers[i]} y={bottom + 30} fillOpacity={0.7}>{month.month.slice(0, 4)}</text>}
            </g>
          )
        })}

        {months.map((month, i) => (
          <rect
            key={month.month}
            x={LEFT + slot * i}
            y={TOP}
            width={slot}
            height={PLOT + AXIS}
            fill="transparent"
            tabIndex={0}
            role="img"
            aria-label={describeMonth(month)}
            className="outline-none"
            onPointerEnter={() => setActive(i)}
            onPointerMove={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        ))}
      </svg>
      {current && <Tooltip month={current} left={tooltipLeft} />}
    </div>
  )
}
