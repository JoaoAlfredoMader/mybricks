import { Link } from '@tanstack/react-router'

export function ContractNotFound() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Contrato não encontrado</h1>
      <p className="text-sm text-muted-foreground">Ele não faz parte desta carteira, ou o endereço está incompleto.</p>
      <Link to="/app/contratos" className="text-sm font-medium underline underline-offset-4">
        Ver todos os contratos
      </Link>
    </main>
  )
}
