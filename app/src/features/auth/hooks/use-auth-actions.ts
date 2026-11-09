import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { sessionQueryOptions } from '../api/session'
import { orThrow } from '../lib/auth-error'
import { verificationCallbackUrl } from '../lib/verification'

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
    // The callback is where the link of a re-sent confirmation e-mail lands.
    mutationFn: (values: SignInValues) =>
      orThrow(authClient.signIn.email({ ...values, callbackURL: verificationCallbackUrl() })),
    onSuccess: () => refreshSession(queryClient),
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()
  return useMutation({
    // The API creates the personal organization and makes it the active one. When it asks for the
    // e-mail to be confirmed first, the answer carries no token and no session exists yet.
    mutationFn: (values: SignUpValues) =>
      orThrow(authClient.signUp.email({ ...values, callbackURL: verificationCallbackUrl() })),
    onSuccess: () => refreshSession(queryClient),
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      orThrow(authClient.sendVerificationEmail({ email, callbackURL: verificationCallbackUrl() })),
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
