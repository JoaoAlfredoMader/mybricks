/** A failed call to Better Auth, with a message the visitor can read. */
export class AuthError extends Error {
  readonly code: string | undefined
  readonly status: number

  constructor({ code, status }: { code?: string | undefined; status: number }) {
    super(authErrorMessage(code, status))
    this.name = 'AuthError'
    this.code = code
    this.status = status
  }
}

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  INVALID_EMAIL: 'Este e-mail não parece válido.',
  INVALID_PASSWORD: 'E-mail ou senha incorretos.',
  USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail. Entre com ela.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com este e-mail. Entre com ela.',
  PASSWORD_TOO_SHORT: 'A senha precisa ter pelo menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'Essa senha é longa demais.',
  BANNED_USER: 'Esta conta foi suspensa.',
}

export function authErrorMessage(code: string | undefined, status: number): string {
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (status === 429) return 'Muitas tentativas seguidas. Espere um pouco e tente de novo.'
  return 'Não foi possível entrar agora. Tente de novo em instantes.'
}

type BetterAuthResult<T> = { data: T; error: null } | { data: null; error: { code?: string | undefined; status: number } }

/** Turns Better Auth's `{ data, error }` answer into a value or a thrown AuthError. */
export async function orThrow<T>(request: Promise<BetterAuthResult<T>>): Promise<T> {
  const { data, error } = await request
  if (error) throw new AuthError(error)
  return data
}
