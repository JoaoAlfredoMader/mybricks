import type { ReservationStatus } from '../api/queries'
import { RESERVATION_STATUS } from '../lib/labels'

/** The reservation's status as a coloured dot next to its name (never colour alone). */
export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const { label, color } = RESERVATION_STATUS[status]
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  )
}
