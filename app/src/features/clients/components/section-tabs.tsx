import { Link } from '@tanstack/react-router'
import { cn } from 'cn'

const TAB =
  'flex h-8 items-center rounded-full px-4 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground'

/** Clientes and Imobiliárias are two lists under one sidebar item; this switches between them. */
export function SectionTabs() {
  return (
    <nav aria-label="Cadastros" className="mt-6">
      <div className="flex w-fit gap-1 rounded-full bg-muted p-1">
        <Link
          to="/app/clientes"
          activeOptions={{ exact: true, includeSearch: false }}
          className={cn(TAB)}
          activeProps={{ className: 'bg-card font-medium text-foreground shadow-sm' }}
        >
          Clientes
        </Link>
        <Link
          to="/app/clientes/imobiliarias"
          activeOptions={{ exact: true, includeSearch: false }}
          className={cn(TAB)}
          activeProps={{ className: 'bg-card font-medium text-foreground shadow-sm' }}
        >
          Imobiliárias
        </Link>
      </div>
    </nav>
  )
}
