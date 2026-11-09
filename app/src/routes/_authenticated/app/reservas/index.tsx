import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import {
  type ReservationFilters,
  reservationsQueryOptions,
  shortStayPropertiesQueryOptions,
} from '@/features/reservations/api/queries'
import { ReservationsPage } from '@/features/reservations/components/reservations-page'

// A malformed value in the URL falls back to "no filter" instead of an error page.
const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  status: z.enum(['confirmed', 'cancelled']).optional().catch(undefined),
  propertyId: z.uuid().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/app/reservas/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ ...search, page: search.page ?? 1 }),
  // The property filter names the properties; loading them alongside keeps the menu from popping in.
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(reservationsQueryOptions(deps)),
      queryClient.ensureQueryData(shortStayPropertiesQueryOptions),
    ]),
  component: ReservationsRoute,
})

export function ReservationsRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filters: ReservationFilters = { ...search, page: search.page ?? 1 }

  const onFiltersChange = useCallback(
    ({ page, ...rest }: ReservationFilters) =>
      navigate({ search: { ...rest, page: page > 1 ? page : undefined }, replace: true }),
    [navigate],
  )

  return <ReservationsPage filters={filters} onFiltersChange={onFiltersChange} />
}
