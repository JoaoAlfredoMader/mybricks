import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { FormPage } from '@/components/form/form-page'
import { shortStayPropertiesQueryOptions } from '@/features/reservations/api/queries'
import { NewReservationForm } from '@/features/reservations/components/reservation-form'
import { useCreateReservation } from '@/features/reservations/hooks/use-reservation-mutations'
import { emptyNewReservation } from '@/features/reservations/lib/reservation-form'

export const Route = createFileRoute('/_authenticated/app/reservas/nova')({
  // Opened from a property, the form starts with that property chosen.
  validateSearch: z.object({ propertyId: z.uuid().optional().catch(undefined) }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(shortStayPropertiesQueryOptions),
  component: NewReservationRoute,
})

export function NewReservationRoute() {
  const { propertyId } = Route.useSearch()
  const navigate = useNavigate()
  const create = useCreateReservation()
  const properties = useSuspenseQuery(shortStayPropertiesQueryOptions).data.items
  const preselected = properties.some((p) => p.id === propertyId) ? propertyId : undefined
  const back = preselected
    ? ({ to: '/app/imoveis/$propertyId', params: { propertyId: preselected } } as const)
    : ({ to: '/app/reservas' } as const)

  return (
    <FormPage
      title="Nova reserva"
      description="Duas reservas confirmadas do mesmo imóvel não podem ter uma noite em comum."
      back={back}
    >
      <NewReservationForm
        initialValues={emptyNewReservation(preselected)}
        properties={properties}
        cancel={back}
        onSubmit={async (request) => {
          const reservation = await create.mutateAsync(request)
          await navigate({ to: '/app/reservas/$reservationId', params: { reservationId: reservation.id } })
        }}
      />
    </FormPage>
  )
}
