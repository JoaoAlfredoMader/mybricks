import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import { type ContractFilters, contractsQueryOptions } from '@/features/contracts/api/queries'
import { ContractsPage } from '@/features/contracts/components/contracts-page'

// A malformed value in the URL falls back to "no filter" instead of an error page.
const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  status: z.enum(['active', 'ended', 'cancelled']).optional().catch(undefined),
  contractType: z.enum(['conventional', 'short_stay']).optional().catch(undefined),
  propertyId: z.uuid().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/app/contratos/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ ...search, page: search.page ?? 1 }),
  loader: ({ context: { queryClient }, deps }) => queryClient.ensureQueryData(contractsQueryOptions(deps)),
  component: ContractsRoute,
})

export function ContractsRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filters: ContractFilters = { ...search, page: search.page ?? 1 }

  const onFiltersChange = useCallback(
    ({ page, ...rest }: ContractFilters) =>
      navigate({ search: { ...rest, page: page > 1 ? page : undefined }, replace: true }),
    [navigate],
  )

  return <ContractsPage filters={filters} onFiltersChange={onFiltersChange} />
}
