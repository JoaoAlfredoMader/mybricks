import { queryOptions } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { orThrow } from '../lib/auth-error'

export interface ActiveOrganization {
  id: string
  name: string
  /** A guest's sample workspace, deleted at `demoExpiresAt`. */
  isDemo: boolean
  demoExpiresAt: Date | null
}

/**
 * The organization of the session, from Better Auth. GET /api/me only carries its id,
 * so its name and demo flag come from here.
 */
export function activeOrganizationQueryOptions(organizationId: string | null) {
  return queryOptions({
    queryKey: ['organization', organizationId],
    queryFn: async (): Promise<ActiveOrganization | null> => {
      const organization = await orThrow(authClient.organization.getFullOrganization())
      if (!organization) return null
      const { isDemo, demoExpiresAt } = organization as { isDemo?: boolean | null; demoExpiresAt?: string | Date | null }
      return {
        id: organization.id,
        name: organization.name,
        isDemo: Boolean(isDemo),
        demoExpiresAt: demoExpiresAt ? new Date(demoExpiresAt) : null,
      }
    },
    enabled: organizationId !== null,
    staleTime: 5 * 60_000,
  })
}
