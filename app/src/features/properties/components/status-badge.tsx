import { type PropertyStatus, STATUS } from '../lib/labels'

/** The derived status, as a coloured dot next to its name (never colour alone). */
export function StatusBadge({ status }: { status: PropertyStatus }) {
  const { label, color } = STATUS[status]
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  )
}
