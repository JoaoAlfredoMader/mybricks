import { Link } from '@tanstack/react-router'

export function PropertyNotFound() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Imóvel não encontrado</h1>
      <p className="text-sm text-muted-foreground">Ele pode ter sido excluído, ou não faz parte desta carteira.</p>
      <Link to="/app/imoveis" className="text-sm font-medium underline underline-offset-4">
        Ver todos os imóveis
      </Link>
    </main>
  )
}
