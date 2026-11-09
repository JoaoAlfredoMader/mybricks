import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import {
  type CreateReservationRequest,
  type Reservation,
  reservationQueryOptions,
  type UpdateReservationRequest,
} from '../api/queries'

/**
 * Reservations are what a short-stay property earns, so after any change the reservations,
 * the properties (their status) and every indicator are read again.
 */
function useRefreshAfterWrite() {
  const queryClient = useQueryClient()
  return async (reservation: Reservation) => {
    queryClient.setQueryData(reservationQueryOptions(reservation.id).queryKey, reservation)
    await Promise.all(
      ['reservations', 'properties', 'kpis', 'occupants'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    )
  }
}

export function useCreateReservation() {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (body: CreateReservationRequest) => unwrap(api.POST('/api/reservations', { body })),
    onSuccess: refresh,
  })
}

export function useUpdateReservation(id: string) {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (body: UpdateReservationRequest) =>
      unwrap(api.PATCH('/api/reservations/{id}', { params: { path: { id } }, body })),
    onSuccess: refresh,
  })
}

/** A cancelled reservation frees its nights; it stays on record. */
export function useCancelReservation(id: string) {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: () => unwrap(api.POST('/api/reservations/{id}/cancel', { params: { path: { id } } })),
    onSuccess: refresh,
  })
}
