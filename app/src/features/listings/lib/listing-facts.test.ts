import { describe, expect, it } from 'vitest'
import { makeListing } from '@/test/fake-api'
import { formatListingArea, listingFacts, pricePerSquareMeter } from './listing-facts'

// Intl puts a no-break space after "R$"; the tests read it as a plain space.
const plain = (value: string | null) => value?.replace(/ /g, ' ')

describe('listing facts', () => {
  it('formats the area in square meters or hectares', () => {
    expect(formatListingArea({ value: 62.5, unit: 'm2' })).toBe('62,5 m²')
    expect(formatListingArea({ value: 1200, unit: 'm2' })).toBe('1.200 m²')
    expect(formatListingArea({ value: 12, unit: 'ha' })).toBe('12 ha')
  })

  it('prices per square meter only when the area is in square meters', () => {
    expect(plain(pricePerSquareMeter({ salePriceCents: 45_000_000, area: { value: 60, unit: 'm2' } }))).toBe('R$ 7.500/m²')
    expect(pricePerSquareMeter({ salePriceCents: 900_000_000, area: { value: 12, unit: 'ha' } })).toBeNull()
  })

  it('lists everything the listing has', () => {
    const { main, extra } = listingFacts(makeListing({ area: { value: 60, unit: 'm2' } }))
    expect(main.map((fact) => fact.text)).toEqual(['60 m²', '2 quartos', '1 suíte', '2 banheiros', '1 vaga'])
    expect(extra.map(plain)).toEqual(['R$ 7.500/m²', 'Construído em 2012', 'Estado bom'])
  })

  it('leaves out what is null or zero', () => {
    const { main, extra } = listingFacts(
      makeListing({
        bedrooms: null,
        suites: 0,
        bathrooms: 1,
        parkingSpaces: null,
        builtYear: null,
        conservationState: null,
        area: { value: 5, unit: 'ha' },
      }),
    )
    expect(main.map((fact) => fact.text)).toEqual(['5 ha', '1 banheiro'])
    expect(extra).toEqual([])
  })
})
