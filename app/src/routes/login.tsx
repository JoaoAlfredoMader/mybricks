import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { z } from 'zod'
import { sessionQueryOptions } from '@/features/auth/api/session'
import { LoginPage } from '@/features/auth/components/login-page'
import { redirectTarget } from '@/features/auth/lib/redirect-target'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ context, search }) => {
    // The sign-in screen stays usable when the API cannot be reached; the forms report it.
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions).catch(() => null)
    if (session) throw redirect({ href: redirectTarget(search.redirect), replace: true })
  },
  component: LoginRoute,
})

export function LoginRoute() {
  const router = useRouter()
  const { redirect: target } = Route.useSearch()
  return <LoginPage onSignedIn={() => router.history.replace(redirectTarget(target))} />
}
