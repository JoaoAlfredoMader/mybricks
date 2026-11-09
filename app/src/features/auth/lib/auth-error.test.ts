import { describe, expect, it } from 'vitest'
import { AuthError, authErrorMessage, orThrow } from './auth-error'

describe('authErrorMessage', () => {
  it('says what a known Better Auth code means, in Portuguese', () => {
    expect(authErrorMessage('INVALID_EMAIL_OR_PASSWORD', 401)).toBe('E-mail ou senha incorretos.')
    expect(authErrorMessage('USER_ALREADY_EXISTS', 422)).toBe('Já existe uma conta com este e-mail. Entre com ela.')
    expect(authErrorMessage('PASSWORD_TOO_SHORT', 400)).toBe('A senha precisa ter pelo menos 8 caracteres.')
    expect(authErrorMessage('BANNED_USER', 403)).toBe('Esta conta foi suspensa.')
  })

  it('asks to wait after too many attempts, whatever the code', () => {
    expect(authErrorMessage(undefined, 429)).toBe('Muitas tentativas seguidas. Espere um pouco e tente de novo.')
    expect(authErrorMessage('SOMETHING_NEW', 429)).toBe('Muitas tentativas seguidas. Espere um pouco e tente de novo.')
  })

  it('does not blame the visitor for what it does not know', () => {
    expect(authErrorMessage(undefined, 500)).toBe('Não foi possível entrar agora. Tente de novo em instantes.')
    expect(authErrorMessage('SOMETHING_NEW', 400)).toBe('Não foi possível entrar agora. Tente de novo em instantes.')
  })
})

describe('AuthError', () => {
  it('carries the message, the code and the status', () => {
    const error = new AuthError({ code: 'INVALID_EMAIL', status: 400 })
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AuthError')
    expect(error.message).toBe('Este e-mail não parece válido.')
    expect(error.code).toBe('INVALID_EMAIL')
    expect(error.status).toBe(400)
    expect(new AuthError({ status: 500 }).code).toBeUndefined()
  })
})

describe('orThrow', () => {
  it('gives back the data of an answer without an error', async () => {
    await expect(orThrow(Promise.resolve({ data: { id: 1 }, error: null }))).resolves.toEqual({ id: 1 })
  })

  it('throws an AuthError for an answer with one', async () => {
    const failure = orThrow(Promise.resolve({ data: null, error: { code: 'INVALID_PASSWORD', status: 401 } }))
    await expect(failure).rejects.toBeInstanceOf(AuthError)
    await expect(failure).rejects.toMatchObject({ message: 'E-mail ou senha incorretos.', status: 401 })
  })
})
