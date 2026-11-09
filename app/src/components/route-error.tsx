import { Link, useRouter } from '@tanstack/react-router'
import { Button, buttonVariants } from '@/components/ui/button'

/** What a route shows when its data could not be loaded, usually because the API is down. */
export function RouteError() {
  const router = useRouter()
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="text-xl font-semibold">Não foi possível carregar esta página</h1>
        <p className="text-sm text-muted-foreground">O servidor não respondeu. Verifique a conexão e tente de novo.</p>
        <div className="mt-2 flex gap-2">
          <Button onClick={() => router.invalidate()}>Tentar de novo</Button>
          <Link to="/" className={buttonVariants({ variant: 'outline' })}>
            Ir para o início
          </Link>
        </div>
      </div>
    </main>
  )
}
