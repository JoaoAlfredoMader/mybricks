import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import {
  type TransactionFilters,
  transactionCategoriesQueryOptions,
  transactionsQueryOptions,
} from '@/features/finances/api/queries'
import { TransactionsPage } from '@/features/finances/components/transactions-page'
import { propertyOptionsQueryOptions } from '@/features/properties/api/queries'

// A malformed value in the URL falls back to "no filter" instead of an error page.
const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  type: z.enum(['revenue', 'expense']).optional().catch(undefined),
  categoryId: z.number().int().positive().optional().catch(undefined),
  propertyId: z.uuid().optional().catch(undefined),
  recurring: z.enum(['true', 'false']).optional().catch(undefined),
  period: z.enum(['this-month', 'last-month', 'this-year', 'last-12-months']).optional().catch(undefined),
  flow: z.enum(['last-12-months', 'this-year', 'last-year']).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/app/financas/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ ...search, page: search.page ?? 1 }),
  // The filters name categories and properties; loading them alongside keeps the menus from popping in.
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(transactionsQueryOptions(deps)),
      queryClient.ensureQueryData(transactionCategoriesQueryOptions),
      queryClient.ensureQueryData(propertyOptionsQueryOptions),
    ]),
  component: TransactionsRoute,
})

export function TransactionsRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const filters: TransactionFilters = { ...search, page: search.page ?? 1 }

  const onFiltersChange = useCallback(
    ({ page, ...rest }: TransactionFilters) =>
      navigate({ search: { ...rest, page: page > 1 ? page : undefined }, replace: true }),
    [navigate],
  )

  return <TransactionsPage filters={filters} onFiltersChange={onFiltersChange} />
}
