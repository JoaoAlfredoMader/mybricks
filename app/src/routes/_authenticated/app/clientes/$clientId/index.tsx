import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { clientQueryOptions } from '@/features/clients/api/queries'
import { ClientDetailPage } from '@/features/clients/components/client-detail-page'
import { ClientNotFound } from '@/features/clients/components/client-not-found'
import { loadOrNotFound } from '@/lib/load-or-not-found'

export const Route = createFileRoute('/_authenticated/app/clientes/$clientId/')({
  loader: ({ context: { queryClient }, params: { clientId } }) =>
    loadOrNotFound([queryClient.ensureQueryData(clientQueryOptions(clientId))]),
  component: ClientDetailRoute,
  notFoundComponent: ClientNotFound,
})

export function ClientDetailRoute() {
  const { clientId } = Route.useParams()
  const { session } = Route.useRouteContext()
  const client = useSuspenseQuery(clientQueryOptions(clientId)).data
  return <ClientDetailPage client={client} canDelete={session.impersonatedById === null} />
}
