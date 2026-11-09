import type { TransactionType } from '../api/queries'
import { TRANSACTION_TYPE } from '../lib/labels'

/** Revenue or expense as a coloured dot next to its name (never colour alone). */
export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const { label, color } = TRANSACTION_TYPE[type]
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  )
}
