/**
 * Where the link of the confirmation e-mail sends the visitor afterwards. The API signs them in
 * first; /login then forwards a signed-in visitor to the app, and shows the reason when the link
 * was no good (?error=...).
 */
export function verificationCallbackUrl(): string {
  return `${window.location.origin}/login`
}

const LINK_ERRORS = new Set(['INVALID_TOKEN', 'TOKEN_EXPIRED', 'USER_NOT_FOUND'])

/** The message for a bad confirmation link, or `null` when the ?error= is not about one. */
export function verificationLinkError(code: string | undefined): string | null {
  if (!code || !LINK_ERRORS.has(code.toUpperCase())) return null
  return 'Este link de confirmação expirou ou já foi usado. Entre com seu e-mail e senha para receber um novo.'
}
