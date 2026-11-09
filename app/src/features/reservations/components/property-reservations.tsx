import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { formatMoney } from '@/lib/format'
import { reservationsQueryOptions } from '../api/queries'
import { formatNights, stayPeriod } from '../lib/labels'
import { ReservationStatusBadge } from './reservation-status-badge'

const SHOWN = 5

/** The short-stay property's latest reservations, on its page, with a way to add one. */
export function PropertyReservations({ propertyId }: { propertyId: string }) {
  const page = useQuery(reservationsQueryOptions({ page: 1, propertyId }, SHOWN)).data
  const reservations = page?.items ?? []

  return (
    <section aria-labelledby="property-reservations-title" className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="property-reservations-title" className="font-semibold">
            Reservas
          </h2>
          <p className="text-sm text-muted-foreground">
            {page && page.total > SHOWN ? `As ${SHOWN} mais recentes de ${page.total}.` : 'Da entrada mais recente para a mais antiga.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {page && page.total > 0 && (
            <Link
              to="/app/reservas"
              search={{ propertyId }}
              className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'h-10 px-4' })}
            >
              Ver todas
            </Link>
          )}
          <Link
            to="/app/reservas/nova"
            search={{ propertyId }}
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10 px-5' })}
          >
            <Plus aria-hidden="true" />
            Nova reserva
          </Link>
        </div>
      </div>

      {page && reservations.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          Nenhuma reserva ainda.
        </p>
      ) : (
        <ul className="mt-4 divide-y rounded-xl border">
          {reservations.map((reservation) => (
            <li key={reservation.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <div className="min-w-0">
                <Link
                  to="/app/reservas/$reservationId"
                  params={{ reservationId: reservation.id }}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {reservation.guest.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {stayPeriod(reservation)} · {formatNights(reservation.nights)} · {formatMoney(reservation.totalAmountCents)}
                </p>
              </div>
              <ReservationStatusBadge status={reservation.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
