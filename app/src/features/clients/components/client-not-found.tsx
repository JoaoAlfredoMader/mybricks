import { Link } from '@tanstack/react-router'

export function ClientNotFound() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Cliente não encontrado</h1>
      <p className="text-sm text-muted-foreground">Ele pode ter sido excluído, ou não faz parte desta carteira.</p>
      <Link to="/app/clientes" className="text-sm font-medium underline underline-offset-4">
        Ver todos os clientes
      </Link>
    </main>
  )
}
