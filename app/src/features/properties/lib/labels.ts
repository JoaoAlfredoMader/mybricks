import type { Schemas } from '@/lib/api/client'

type Property = Schemas['Property']
export type PropertyStatus = Property['status']
export type PropertyType = Property['propertyType']
export type UsageType = Property['usageType']

interface StatusStyle {
  /** One property: "Alugado". */
  label: string
  /** The group: "Alugados". */
  group: string
  /** Categorical slot, in this fixed order (dataviz palette, validated on white). */
  color: string
}

/** The status the API derives for a property, in the order charts show it. */
export const STATUS: Record<PropertyStatus, StatusStyle> = {
  rented: { label: 'Alugado', group: 'Alugados', color: 'var(--chart-1)' },
  vacant: { label: 'Vago', group: 'Vagos', color: 'var(--chart-2)' },
  own_use: { label: 'Uso próprio', group: 'Uso próprio', color: 'var(--chart-3)' },
  loan_for_use: { label: 'Comodato', group: 'Comodato', color: 'var(--chart-4)' },
}

export const STATUS_ORDER: PropertyStatus[] = ['rented', 'vacant', 'own_use', 'loan_for_use']

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  residential: 'Residencial',
  commercial: 'Comercial',
  land: 'Terreno',
  logistics: 'Logístico',
  rural: 'Rural',
  parking: 'Vaga de garagem',
}

export const USAGE_LABEL: Record<UsageType, string> = {
  rental: 'Locação',
  short_stay: 'Temporada',
  agricultural_lease: 'Arrendamento rural',
  concession: 'Concessão',
  own_use: 'Uso próprio',
  loan_for_use: 'Comodato',
}

export const CONSERVATION_LABEL: Record<NonNullable<Property['conservationState']>, string> = {
  degraded: 'Degradado',
  poor: 'Ruim',
  regular: 'Regular',
  good: 'Bom',
  excellent: 'Excelente',
}

export const ACQUISITION_LABEL: Record<NonNullable<Property['acquisition']>['acquisitionType'], string> = {
  purchase: 'Compra',
  construction: 'Construção',
  inheritance: 'Herança',
  other: 'Outra',
}

export const AMORTIZATION_LABEL: Record<NonNullable<Property['financing']>['amortizationSystem'], string> = {
  sac: 'SAC',
  price: 'Price',
}

export const IRR_UNAVAILABLE: Record<NonNullable<Schemas['PropertyKpis']['irr']['unavailableReason']>, string> = {
  no_acquisition_date: 'Sem data de aquisição',
  no_acquisition_cost: 'Sem custo de aquisição',
  no_estimated_value: 'Sem valor estimado',
  period_too_short: 'Período curto demais',
  no_solution: 'Sem solução para os fluxos',
}
