import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/lib/api/client'
import { monthBounds } from '../lib/calendar'

export type Reservation = Schemas['Reservation']
export type ReservationStatus = Reservation['status']
export type CreateReservationRequest = Schemas['CreateReservationRequest']
export type UpdateReservationRequest = Schemas['UpdateReservationRequest']

export const PAGE_SIZE = 20

export interface ReservationFilters {
  page: number
  status?: ReservationStatus | undefined
  propertyId?: string | undefined
}

export function reservationsQueryOptions({ page, status, propertyId }: ReservationFilters, pageSize = PAGE_SIZE) {
  const query = {
    page,
    pageSize,
    ...(status ? { status } : {}),
    ...(propertyId ? { propertyId } : {}),
  }
  return queryOptions({
    queryKey: ['reservations', 'list', query],
    queryFn: () => unwrap(api.GET('/api/reservations', { params: { query } })),
    placeholderData: keepPreviousData,
  })
}

/**
 * The confirmed stays that touch a month (`from`/`to` is the window [from, to), which is what a
 * calendar needs). A cancelled stay frees its nights, so it does not show. A hundred is the most the
 * API gives in a page; `total` says when there were more.
 */
export function monthReservationsQueryOptions(month: string) {
  const { first, next } = monthBounds(month)
  const query = { from: first, to: next, status: 'confirmed' as const, pageSize: 100 }
  return queryOptions({
    queryKey: ['reservations', 'calendar', month],
    queryFn: () => unwrap(api.GET('/api/reservations', { params: { query } })),
    placeholderData: keepPreviousData,
  })
}

export function reservationQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['reservations', 'detail', id],
    queryFn: () => unwrap(api.GET('/api/reservations/{id}', { params: { path: { id } } })),
  })
}

/** Only short-stay properties take reservations; the first hundred, by name. */
export const shortStayPropertiesQueryOptions = queryOptions({
  queryKey: ['properties', 'short-stay'],
  queryFn: () =>
    unwrap(api.GET('/api/properties', { params: { query: { usageType: 'short_stay', pageSize: 100 } } })),
})
