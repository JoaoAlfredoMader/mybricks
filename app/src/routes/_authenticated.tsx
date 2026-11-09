import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/features/app-shell/components/app-layout'
import { sessionQueryOptions } from '@/features/auth/api/session'

/** Every route below needs a session; without one the visitor goes to /login and comes back. */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) throw redirect({ to: '/login', search: { redirect: location.href }, replace: true })
    return { session }
  },
  component: AuthenticatedLayout,
})

export function AuthenticatedLayout() {
  const { session } = Route.useRouteContext()
  return <AppLayout session={session} />
}
