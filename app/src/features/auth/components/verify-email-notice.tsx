import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useResendVerification } from '../hooks/use-auth-actions'
import { FormAlert } from './form-alert'

/** Shown after sign-up when the API wants the e-mail confirmed before the first sign-in. */
export function VerifyEmailNotice({ email, onBack }: { email: string; onBack: () => void }) {
  const resend = useResendVerification()

  return (
    <div className="grid gap-4" role="status">
      <MailCheck className="size-8 text-primary" aria-hidden="true" />
      <div className="grid gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight">Confirme seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um link para <strong className="font-medium text-foreground">{email}</strong>. Abra a mensagem e
          clique em “Confirmar e-mail” para ativar sua conta. Se não encontrar, olhe também o spam.
        </p>
      </div>
      <FormAlert error={resend.error} />
      {resend.isSuccess ? <p className="text-sm text-muted-foreground">Enviamos o link de novo.</p> : null}
      <div className="grid gap-2">
        <Button variant="outline" size="lg" className="h-10" disabled={resend.isPending} onClick={() => resend.mutate(email)}>
          {resend.isPending ? 'Enviando…' : 'Reenviar e-mail'}
        </Button>
        <Button variant="ghost" size="lg" className="h-10" onClick={onBack}>
          Usar outro e-mail
        </Button>
      </div>
    </div>
  )
}
