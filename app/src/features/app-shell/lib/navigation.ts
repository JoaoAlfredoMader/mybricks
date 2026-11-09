import {
  Building2,
  CalendarDays,
  FileSignature,
  LayoutDashboard,
  type LucideIcon,
  Users,
  Wallet,
} from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  /** Absent while the screen is not built yet. */
  to?: '/app' | '/app/imoveis' | '/app/contratos' | '/app/reservas' | '/app/financas' | '/app/clientes'
  /** Highlight only on this exact path (the home), not on the pages below it. */
  exact?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Painel', icon: LayoutDashboard, to: '/app', exact: true },
  { label: 'Imóveis', icon: Building2, to: '/app/imoveis' },
  { label: 'Contratos', icon: FileSignature, to: '/app/contratos' },
  { label: 'Reservas', icon: CalendarDays, to: '/app/reservas' },
  { label: 'Finanças', icon: Wallet, to: '/app/financas' },
  { label: 'Clientes', icon: Users, to: '/app/clientes' },
]
