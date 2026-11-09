import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import { type ClientFilters, clientsQueryOptions } from '@/features/clients/api/queries'
import { ClientsPage } from '@/features/clients/components/clients-page'

// A malformed value in the URL falls back to "no filter" instead of an error page.
const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  personType: z.enum(['individual', 'company']).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/app/clientes/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ ...search, page: search.page ?? 1 }),
  loader: ({ context: { queryClient }, deps }) => queryClient.ensureQueryData(clientsQueryOptions(deps)),
  component: ClientsRoute,
})

export function ClientsRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filters: ClientFilters = { ...search, page: search.page ?? 1 }

  const onFiltersChange = useCallback(
    ({ page, ...rest }: ClientFilters) => navigate({ search: { ...rest, page: page > 1 ? page : undefined }, replace: true }),
    [navigate],
  )

  return <ClientsPage filters={filters} onFiltersChange={onFiltersChange} />
}
