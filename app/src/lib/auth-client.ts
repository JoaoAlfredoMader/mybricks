import { adminClient, anonymousClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

/**
 * Better Auth on the API, mounted at /api/auth on the same origin (Vite proxies /api in
 * development). Who is signed in is read from GET /api/me, not from this client.
 */
export const authClient = createAuthClient({
  plugins: [organizationClient(), adminClient(), anonymousClient()],
  // Looked up on every call, not captured once, so tests can stub fetch.
  fetchOptions: { customFetchImpl: (input, init) => globalThis.fetch(input, init) },
})
