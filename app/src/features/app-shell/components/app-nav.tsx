import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { NAV_ITEMS } from '../lib/navigation'

const ITEM = 'flex h-10 shrink-0 items-center gap-3 rounded-full px-4 text-sm font-medium'

/** The sections of the app; the ones not built yet are listed, dimmed, so the map is visible. */
export function AppNav({ className }: { className?: string }) {
  return (
    <nav aria-label="Seções" className={className}>
      <ul className="flex gap-1 lg:flex-col">
        {NAV_ITEMS.map(({ label, icon: Icon, to, exact = false }) => (
          <li key={label}>
            {to ? (
              <Link
                to={to}
                activeOptions={{ exact, includeSearch: false }}
                className={cn(ITEM, 'text-muted-foreground hover:bg-muted hover:text-foreground')}
                activeProps={{ className: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' }}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            ) : (
              <span className={cn(ITEM, 'cursor-default text-muted-foreground/60')} aria-disabled="true">
                <Icon className="size-4" aria-hidden="true" />
                {label}
                <span className="ml-auto hidden text-xs font-normal lg:inline">em breve</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
