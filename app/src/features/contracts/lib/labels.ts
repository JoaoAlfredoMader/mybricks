import type { Property } from '@/features/properties/api/queries'
import type { AdjustmentIndex, ContractStatus, ContractType } from '../api/queries'

/** Each status with a dot colour; the label always goes with it. */
export const CONTRACT_STATUS: Record<ContractStatus, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'var(--chart-3)' },
  ended: { label: 'Encerrado', color: 'var(--muted-foreground)' },
  cancelled: { label: 'Cancelado', color: 'var(--chart-2)' },
}

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  active: 'Ativos',
  ended: 'Encerrados',
  cancelled: 'Cancelados',
}

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  conventional: 'Locação',
  short_stay: 'Temporada',
}

export const ADJUSTMENT_INDEX_LABEL: Record<AdjustmentIndex, string> = {
  igpm: 'IGP-M',
  ipca: 'IPCA',
  inpc: 'INPC',
  igpdi: 'IGP-DI',
  other: 'Outro',
}

/** Own use and loan for use never take contracts; the API refuses them. */
export function takesContracts(property: Pick<Property, 'usageType'>): boolean {
  return property.usageType !== 'own_use' && property.usageType !== 'loan_for_use'
}

/** A short-stay property only takes short-stay contracts, and every other property conventional ones. */
export function contractTypeFor(property: Pick<Property, 'usageType'>): ContractType {
  return property.usageType === 'short_stay' ? 'short_stay' : 'conventional'
}
