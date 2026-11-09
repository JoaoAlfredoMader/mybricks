import { Link } from '@tanstack/react-router'
import { cn } from 'cn'

const TAB =
  'flex h-8 items-center rounded-full px-4 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground'
const ACTIVE = { className: 'bg-card font-medium text-foreground shadow-sm' }

/** The reservations as a list or as a calendar: two views of the same stays. */
export function ReservationViewTabs() {
  return (
    <nav aria-label="Formas de ver as reservas" className="mt-6">
      <div className="flex w-fit gap-1 rounded-full bg-muted p-1">
        <Link to="/app/reservas" activeOptions={{ exact: true, includeSearch: false }} className={cn(TAB)} activeProps={ACTIVE}>
          Lista
        </Link>
        <Link to="/app/reservas/calendario" activeOptions={{ exact: true, includeSearch: false }} className={cn(TAB)} activeProps={ACTIVE}>
          Calendário
        </Link>
      </div>
    </nav>
  )
}
