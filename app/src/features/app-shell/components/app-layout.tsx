import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, useRouter } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { activeOrganizationQueryOptions } from '@/features/auth/api/organization'
import type { Session } from '@/features/auth/api/session'
import { useSignOut } from '@/features/auth/hooks/use-auth-actions'
import { AppNav } from './app-nav'
import { ImpersonationBanner } from './impersonation-banner'

/** The frame of every signed-in screen: sections on the left (on top on small screens). */
export function AppLayout({ session }: { session: Session }) {
  const router = useRouter()
  const signOut = useSignOut()
  const organization = useQuery(activeOrganizationQueryOptions(session.organizationId)).data
  const { user } = session

  const signOutButton = (
    <Button
      variant="ghost"
      size="sm"
      disabled={signOut.isPending}
      onClick={() => signOut.mutate(undefined, { onSuccess: () => router.navigate({ to: '/' }) })}
    >
      <LogOut aria-hidden="true" />
      Sair
    </Button>
  )

  return (
    <div className="min-h-svh bg-background text-foreground">
      {session.impersonatedById && (
        <ImpersonationBanner userName={user.name} onStopped={() => router.invalidate()} />
      )}
      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="border-b bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between gap-3 px-4 pt-4 lg:px-5 lg:pt-6">
            <Link to="/app" className="flex min-w-0 items-center gap-2.5 rounded-full">
              <BrandMark className="size-7 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block font-semibold tracking-tight">MyBricks</span>
                {organization && (
                  <span className="block truncate text-xs text-muted-foreground">{organization.name}</span>
                )}
              </span>
            </Link>
            <div className="lg:hidden">{signOutButton}</div>
          </div>

          <AppNav className="overflow-x-auto px-3 py-3 [scrollbar-width:none] lg:mt-6 lg:flex-1 lg:px-3 lg:py-0" />

          <div className="hidden border-t px-5 py-4 lg:block">
            <p className="truncate text-sm font-medium">{user.isAnonymous ? 'Convidado' : user.name}</p>
            {!user.isAnonymous && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
            <div className="mt-3 -ml-2.5">{signOutButton}</div>
          </div>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
