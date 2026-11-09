import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import {
  type PropertyFilters,
  propertiesQueryOptions,
  propertyCatalogQueryOptions,
} from '@/features/properties/api/queries'
import { PropertiesPage } from '@/features/properties/components/properties-page'

// A malformed value in the URL falls back to "no filter" instead of an error page.
const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  propertyType: z.enum(['residential', 'commercial', 'land', 'logistics', 'rural', 'parking']).optional().catch(undefined),
  usageType: z
    .enum(['rental', 'short_stay', 'agricultural_lease', 'concession', 'own_use', 'loan_for_use'])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/app/imoveis/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ ...search, page: search.page ?? 1 }),
  // The catalog names the subtypes; loading it alongside keeps them from popping in.
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(propertiesQueryOptions(deps)),
      queryClient.ensureQueryData(propertyCatalogQueryOptions),
    ]),
  component: PropertiesRoute,
})

export function PropertiesRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filters: PropertyFilters = { ...search, page: search.page ?? 1 }

  const onFiltersChange = useCallback(
    ({ page, ...rest }: PropertyFilters) =>
      navigate({ search: { ...rest, page: page > 1 ? page : undefined }, replace: true }),
    [navigate],
  )

  return <PropertiesPage filters={filters} onFiltersChange={onFiltersChange} />
}
