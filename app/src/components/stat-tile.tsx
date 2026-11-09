import { cn } from 'cn'

interface StatTileProps {
  label: string
  value: string
  /** A short line under the value: what it is measured against. */
  hint?: string | undefined
  /** For the grid that holds the tile: spans, mostly. */
  className?: string
}

export function StatTile({ label, value, hint, className }: StatTileProps) {
  return (
    <div className={cn('min-w-0 rounded-2xl border bg-card p-4 sm:p-5', className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  )
}
