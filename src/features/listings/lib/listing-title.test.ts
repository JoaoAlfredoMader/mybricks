import { describe, expect, it } from 'vitest'
import { listingTitle } from './listing-title'

describe('listing title', () => {
  it('is the subtype and the neighborhood', () => {
    expect(listingTitle({ subtypeName: 'Casa', propertyType: 'residential', neighborhood: 'Lagoa da Conceição' })).toBe(
      'Casa no Lagoa da Conceição',
    )
  })

  it('falls back to the property type when there is no subtype', () => {
    expect(listingTitle({ subtypeName: null, propertyType: 'land', neighborhood: 'Centro' })).toBe('Terreno no Centro')
  })
})
