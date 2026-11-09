import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { useSignIn } from '../hooks/use-auth-actions'
import { type SignInForm as Values, signInSchema } from '../lib/schemas'
import { FormAlert } from './form-alert'
import { TextField } from './text-field'

export function SignInForm({ onSignedIn }: { onSignedIn: () => void }) {
  const signIn = useSignIn()
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const submit = handleSubmit((values) => signIn.mutate(values, { onSuccess: onSignedIn }))

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <TextField
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={formState.errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={formState.errors.password?.message}
        {...register('password')}
      />
      <FormAlert error={signIn.error} />
      <Button type="submit" size="lg" className="h-10" disabled={signIn.isPending}>
        {signIn.isPending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
