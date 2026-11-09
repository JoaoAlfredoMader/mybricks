export const HOME_AFTER_SIGN_IN = '/app'

/**
 * Where to go after signing in. Only paths inside this app are accepted, so a crafted
 * ?redirect= cannot send the visitor to another site.
 */
export function redirectTarget(redirect: string | undefined): string {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//') || redirect.startsWith('/\\')) {
    return HOME_AFTER_SIGN_IN
  }
  if (redirect === '/login' || redirect.startsWith('/login?')) return HOME_AFTER_SIGN_IN
  return redirect
}
