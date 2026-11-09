import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { agenciesQueryOptions } from '@/features/clients/api/queries'
import { AgenciesPage } from '@/features/clients/components/agencies-page'

export const Route = createFileRoute('/_authenticated/app/clientes/imobiliarias')({
  validateSearch: z.object({ page: z.number().int().min(1).optional().catch(undefined) }),
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ context: { queryClient }, deps }) => queryClient.ensureQueryData(agenciesQueryOptions(deps.page)),
  component: AgenciesRoute,
})

export function AgenciesRoute() {
  const { page = 1 } = Route.useSearch()
  const { session } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <AgenciesPage
      page={page}
      onPageChange={(next) => navigate({ search: { page: next > 1 ? next : undefined }, replace: true })}
      canDelete={session.impersonatedById === null}
    />
  )
}
