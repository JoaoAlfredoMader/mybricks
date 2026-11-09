import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { sessionQueryOptions } from '../api/session'
import { orThrow } from '../lib/auth-error'

export interface SignInValues {
  email: string
  password: string
}

export interface SignUpValues extends SignInValues {
  name: string
}

/** Reads /api/me again so the routes see the new session before navigating. */
function refreshSession(queryClient: QueryClient) {
  return queryClient.fetchQuery({ ...sessionQueryOptions, staleTime: 0 })
}

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: SignInValues) => orThrow(authClient.signIn.email(values)),
    onSuccess: () => refreshSession(queryClient),
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()
  return useMutation({
    // The API creates the personal organization and makes it the active one.
    mutationFn: (values: SignUpValues) => orThrow(authClient.signUp.email(values)),
    onSuccess: () => refreshSession(queryClient),
  })
}

export function useGuestSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    // The API creates a guest with a demo workspace filled with sample data.
    mutationFn: () => orThrow(authClient.signIn.anonymous()),
    onSuccess: () => refreshSession(queryClient),
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => orThrow(authClient.signOut()),
    onSuccess: () => {
      // Nothing cached for this organization may outlive the session.
      queryClient.clear()
      queryClient.setQueryData(sessionQueryOptions.queryKey, null)
    },
  })
}

export function useStopImpersonating() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => orThrow(authClient.admin.stopImpersonating()),
    onSuccess: async () => {
      queryClient.clear()
      await refreshSession(queryClient)
    },
  })
}
