import { CONSERVATION_LABEL } from '@/features/properties/lib/labels'
import { formatWholeMoney } from '@/lib/format'
import type { Listing } from '../api/queries'

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** 62,5 m² or 12 ha. */
export function formatListingArea({ value, unit }: Listing['area']): string {
  return `${number.format(value)} ${unit === 'ha' ? 'ha' : 'm²'}`
}

/** R$ 7.258/m², only where the area is in square meters (a farm is not priced per m²). */
export function pricePerSquareMeter(listing: Pick<Listing, 'salePriceCents' | 'area'>): string | null {
  const { value, unit } = listing.area
  if (unit !== 'm2' || value <= 0) return null
  return `${formatWholeMoney(listing.salePriceCents / value)}/m²`
}

export type FactKey = 'area' | 'bedrooms' | 'suites' | 'bathrooms' | 'parking'

export interface Fact {
  key: FactKey
  text: string
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

/** The facts worth a place of their own, then the smaller print; whatever the listing leaves null is left out. */
export function listingFacts(listing: Listing): { main: Fact[]; extra: string[] } {
  const main: Fact[] = [{ key: 'area', text: formatListingArea(listing.area) }]
  const counts: [FactKey, number | null, string, string][] = [
    ['bedrooms', listing.bedrooms, 'quarto', 'quartos'],
    ['suites', listing.suites, 'suíte', 'suítes'],
    ['bathrooms', listing.bathrooms, 'banheiro', 'banheiros'],
    ['parking', listing.parkingSpaces, 'vaga', 'vagas'],
  ]
  for (const [key, count, one, many] of counts) {
    if (count !== null && count > 0) main.push({ key, text: plural(count, one, many) })
  }

  const extra = [
    pricePerSquareMeter(listing),
    listing.builtYear === null ? null : `Construído em ${listing.builtYear}`,
    listing.conservationState === null ? null : `Estado ${CONSERVATION_LABEL[listing.conservationState].toLowerCase()}`,
  ].filter((item): item is string => item !== null)

  return { main, extra }
}
