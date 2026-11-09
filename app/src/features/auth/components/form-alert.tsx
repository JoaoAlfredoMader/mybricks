import { CircleAlert } from 'lucide-react'
import { AuthError } from '../lib/auth-error'

/** The reason a sign-in failed, read out as soon as it shows up. */
export function FormAlert({ error }: { error: Error | null }) {
  if (!error) return null
  const message = error instanceof AuthError ? error.message : 'Não foi possível falar com o servidor. Tente de novo.'
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}
