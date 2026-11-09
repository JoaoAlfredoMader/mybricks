import type { ContractStatus } from '../api/queries'
import { CONTRACT_STATUS } from '../lib/labels'

/** The contract's status as a coloured dot next to its name (never colour alone). */
export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const { label, color } = CONTRACT_STATUS[status]
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  )
}
