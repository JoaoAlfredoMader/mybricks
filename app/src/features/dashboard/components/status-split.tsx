import { STATUS, STATUS_ORDER } from '@/features/properties/lib/labels'
import type { PortfolioKpis } from '../api/portfolio-kpis'

const share = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })

function countLabel(count: number) {
  return count === 1 ? '1 imóvel' : `${count} imóveis`
}

/**
 * How the properties split by status: a thin segmented bar read beside a list that
 * gives each part's name, count and share (the list rows carry the swatches, so the
 * bar needs no text and colour is never the only cue).
 */
export function StatusSplit({ byStatus, total }: { byStatus: PortfolioKpis['propertiesByStatus']; total: number }) {
  const parts = STATUS_ORDER.map((status) => ({ status, count: byStatus[status], ...STATUS[status] }))

  return (
    <div>
      {total > 0 && (
        <div className="flex h-2 gap-0.5" role="img" aria-label={parts.map((p) => `${p.group}: ${countLabel(p.count)}`).join(', ')}>
          {parts
            .filter((part) => part.count > 0)
            .map((part) => (
              <div
                key={part.status}
                className="group relative first:rounded-l-full last:rounded-r-full"
                style={{ flexGrow: part.count, flexBasis: 0, background: part.color }}
              >
                {/* Hover layer: the segment and the air around it are the target. */}
                <span className="absolute -inset-y-2 inset-x-0" />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 hidden -translate-x-1/2 rounded-xl border bg-popover px-3 py-2 text-left whitespace-nowrap shadow-md group-hover:block">
                  <span className="block text-sm font-semibold">{countLabel(part.count)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {part.group} · {share.format(part.count / total)}
                  </span>
                </span>
              </div>
            ))}
        </div>
      )}

      <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {parts.map((part) => (
          <li key={part.status} className="flex items-center gap-3 text-sm">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: part.color }} aria-hidden="true" />
            <span className="text-muted-foreground">{part.group}</span>
            <span className="ml-auto font-medium tabular-nums">{part.count}</span>
            <span className="w-10 text-right text-muted-foreground tabular-nums">
              {total > 0 ? share.format(part.count / total) : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
