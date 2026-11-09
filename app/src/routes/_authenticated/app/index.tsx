import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { activeOrganizationQueryOptions } from '@/features/auth/api/organization'
import { portfolioKpisQueryOptions } from '@/features/dashboard/api/portfolio-kpis'
import { DashboardPage } from '@/features/dashboard/components/dashboard-page'

export const Route = createFileRoute('/_authenticated/app/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(portfolioKpisQueryOptions),
  component: DashboardRoute,
})

export function DashboardRoute() {
  const { session } = Route.useRouteContext()
  const kpis = useSuspenseQuery(portfolioKpisQueryOptions).data
  const organization = useQuery(activeOrganizationQueryOptions(session.organizationId)).data
  return <DashboardPage kpis={kpis} organization={organization} />
}
