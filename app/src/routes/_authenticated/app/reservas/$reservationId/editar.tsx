import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { FormPage } from '@/components/form/form-page'
import { reservationQueryOptions } from '@/features/reservations/api/queries'
import { EditReservationForm } from '@/features/reservations/components/reservation-form'
import { ReservationNotFound } from '@/features/reservations/components/reservation-not-found'
import { useUpdateReservation } from '@/features/reservations/hooks/use-reservation-mutations'
import { fromReservation } from '@/features/reservations/lib/reservation-form'
import { loadOrNotFound } from '@/lib/load-or-not-found'

export const Route = createFileRoute('/_authenticated/app/reservas/$reservationId/editar')({
  loader: async ({ context: { queryClient }, params: { reservationId } }) => {
    // Always the stored version: the form must not start from a stale copy.
    const options = { ...reservationQueryOptions(reservationId), staleTime: 0 }
    await loadOrNotFound([queryClient.fetchQuery(options)])
    // Only confirmed reservations can change; a cancelled one goes back to its page.
    if (queryClient.getQueryData(options.queryKey)?.status !== 'confirmed') {
      throw redirect({ to: '/app/reservas/$reservationId', params: { reservationId } })
    }
  },
  component: EditReservationRoute,
  notFoundComponent: ReservationNotFound,
})

export function EditReservationRoute() {
  const { reservationId } = Route.useParams()
  const navigate = useNavigate()
  const update = useUpdateReservation(reservationId)
  const reservation = useSuspenseQuery(reservationQueryOptions(reservationId)).data
  const back = { to: '/app/reservas/$reservationId', params: { reservationId } } as const

  return (
    <FormPage
      title={`Editar reserva de ${reservation.guest.name}`}
      description={`${reservation.propertyName}. O imóvel e o hóspede não mudam; para trocar, cancele esta reserva e cadastre outra.`}
      back={back}
    >
      <EditReservationForm
        propertyId={reservation.propertyId}
        initialValues={fromReservation(reservation)}
        linkedContractId={reservation.contractId}
        cancel={back}
        onSubmit={async (request) => {
          await update.mutateAsync(request)
          await navigate(back)
        }}
      />
    </FormPage>
  )
}
