import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { reservationQueryOptions } from '@/features/reservations/api/queries'
import { ReservationDetailPage } from '@/features/reservations/components/reservation-detail-page'
import { ReservationNotFound } from '@/features/reservations/components/reservation-not-found'
import { loadOrNotFound } from '@/lib/load-or-not-found'

export const Route = createFileRoute('/_authenticated/app/reservas/$reservationId/')({
  loader: ({ context: { queryClient }, params: { reservationId } }) =>
    loadOrNotFound([queryClient.ensureQueryData(reservationQueryOptions(reservationId))]),
  component: ReservationDetailRoute,
  notFoundComponent: ReservationNotFound,
})

export function ReservationDetailRoute() {
  const { reservationId } = Route.useParams()
  const reservation = useSuspenseQuery(reservationQueryOptions(reservationId)).data
  return <ReservationDetailPage reservation={reservation} />
}
