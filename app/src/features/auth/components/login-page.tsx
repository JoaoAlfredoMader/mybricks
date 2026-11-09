import '@fontsource-variable/archivo/standard.css'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { heroImage } from '@/features/landing/lib/hero-images'
import { useGuestSignIn } from '../hooks/use-auth-actions'
import { FormAlert } from './form-alert'
import { SignInForm } from './sign-in-form'
import { SignUpForm } from './sign-up-form'

interface LoginPageProps {
  /** Called once the session exists; the route decides where to go. */
  onSignedIn: () => void
}

export function LoginPage({ onSignedIn }: LoginPageProps) {
  const guest = useGuestSignIn()

  return (
    <div className="grid min-h-svh bg-background text-foreground lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,1fr)]">
      <aside className="relative hidden overflow-hidden lg:block" aria-hidden="true">
        <img
          {...heroImage('day')}
          sizes="55vw"
          alt=""
          className="absolute inset-0 size-full object-cover object-[50%_35%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
        <div className="absolute inset-x-10 bottom-10 text-white">
          <p className="font-['Archivo_Variable'] text-4xl font-semibold tracking-tight [font-stretch:125%]">MyBricks</p>
          <p className="mt-2 max-w-sm text-base text-white/85">
            Imóveis, contratos, reservas e rendimentos da sua carteira num só lugar.
          </p>
        </div>
      </aside>

      <main className="flex flex-col px-4 py-6 sm:px-10">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar ao início
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <BrandMark className="mb-6 size-10 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Entrar no MyBricks</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Use sua conta ou explore uma carteira de exemplo.</p>

          <Tabs defaultValue="sign-in" className="mt-8">
            <TabsList className="grid w-full grid-cols-2 group-data-horizontal/tabs:h-9">
              <TabsTrigger value="sign-in">Entrar</TabsTrigger>
              <TabsTrigger value="sign-up">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="sign-in" className="pt-4">
              <SignInForm onSignedIn={onSignedIn} />
            </TabsContent>
            <TabsContent value="sign-up" className="pt-4">
              <SignUpForm onSignedIn={onSignedIn} />
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground" role="presentation">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-3">
            <Button
              variant="outline"
              size="lg"
              className="h-10"
              disabled={guest.isPending}
              onClick={() => guest.mutate(undefined, { onSuccess: onSignedIn })}
            >
              <Sparkles aria-hidden="true" />
              {guest.isPending ? 'Preparando a demonstração…' : 'Entrar como convidado'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Sem cadastro: uma carteira de exemplo só sua, apagada em 24 horas.
            </p>
            <FormAlert error={guest.error} />
          </div>
        </div>
      </main>
    </div>
  )
}
