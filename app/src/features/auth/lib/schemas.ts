import { z } from 'zod'

// Mirrors the API: e-mail and password, at least 8 characters on sign-up.
export const MIN_PASSWORD_LENGTH = 8

const email = z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email('Este e-mail não parece válido.'))

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
})

export const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.'),
  email,
  password: z.string().min(MIN_PASSWORD_LENGTH, `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`),
})

export type SignInForm = z.infer<typeof signInSchema>
export type SignUpForm = z.infer<typeof signUpSchema>
