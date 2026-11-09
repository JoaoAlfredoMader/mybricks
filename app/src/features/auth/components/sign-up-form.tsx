import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { useSignUp } from '../hooks/use-auth-actions'
import { MIN_PASSWORD_LENGTH, signUpSchema, type SignUpForm as Values } from '../lib/schemas'
import { FormAlert } from './form-alert'
import { TextField } from './text-field'

export function SignUpForm({ onSignedIn }: { onSignedIn: () => void }) {
  const signUp = useSignUp()
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const submit = handleSubmit((values) => signUp.mutate(values, { onSuccess: onSignedIn }))

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <TextField label="Nome" autoComplete="name" error={formState.errors.name?.message} {...register('name')} />
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
        autoComplete="new-password"
        placeholder={`Pelo menos ${MIN_PASSWORD_LENGTH} caracteres`}
        error={formState.errors.password?.message}
        {...register('password')}
      />
      <FormAlert error={signUp.error} />
      <Button type="submit" size="lg" className="h-10" disabled={signUp.isPending}>
        {signUp.isPending ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  )
}
