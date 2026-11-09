import { describe, expect, it } from 'vitest'
import { makePropertyRecord } from '@/test/fake-api'
import type { PropertyCatalog } from '../api/queries'
import {
  apiMessageInPortuguese,
  EMPTY_PROPERTY_FORM,
  fromProperty,
  listingGaps,
  propertyFormSchema,
  type PropertyFormValues,
  toPropertyRequest,
} from './property-form'

const CATALOG: PropertyCatalog = [
  { propertyType: 'residential', subtypes: [{ id: 1, name: 'Apartamento' }], usageTypes: ['rental', 'short_stay', 'own_use'] },
  { propertyType: 'land', subtypes: [], usageTypes: ['own_use', 'agricultural_lease'] },
]

const minimal: PropertyFormValues = { ...EMPTY_PROPERTY_FORM, name: 'Kitnet', propertyType: 'residential', usageType: 'rental' }

function errors(values: PropertyFormValues) {
  const result = propertyFormSchema(CATALOG).safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
}

describe('property form', () => {
  it('accepts the smallest valid property and sends nulls for what is empty', () => {
    expect(errors(minimal)).toEqual({})
    expect(toPropertyRequest(minimal)).toMatchObject({
      name: 'Kitnet',
      propertyType: 'residential',
      subtypeId: null,
      usageType: 'rental',
      ownershipPercentage: 100,
      address: null,
      estimatedValueCents: null,
      annualExpensesCents: 0,
      occupancyRate: 90,
      rentalMode: 'manual',
      manualRental: { tenantName: null, monthlyRentCents: 0, dueDay: null },
      acquisition: null,
      financing: null,
      legalRecord: null,
      insurance: null,
    })
  })

  it('names what is missing or unreadable, in Portuguese', () => {
    expect(errors({ ...EMPTY_PROPERTY_FORM })).toEqual({
      name: 'Dê um nome com pelo menos 2 letras.',
      propertyType: 'Escolha o tipo do imóvel.',
      usageType: 'Escolha o uso do imóvel.',
    })
    expect(errors({ ...minimal, estimatedValue: '1,234', bedrooms: '2,5', builtYear: '1200', ownershipPercentage: '0' })).toEqual({
      estimatedValue: 'Use um valor como 1.234,56.',
      bedrooms: 'Use um número inteiro.',
      builtYear: 'Use um valor entre 1.500 e 2.200.',
      ownershipPercentage: 'Use um percentual acima de 0 e até 100.',
    })
  })

  it('checks the usage against the property type', () => {
    expect(errors({ ...minimal, propertyType: 'land', usageType: 'rental' })).toEqual({
      usageType: 'Este uso não vale para o tipo escolhido.',
    })
  })

  it('needs a city and a street once any part of the address is filled in', () => {
    expect(errors({ ...minimal, number: '12', postalCode: '0131' })).toEqual({
      city: 'Escolha a cidade.',
      street: 'Informe a rua.',
      postalCode: 'O CEP tem 8 dígitos.',
    })
    const withAddress = { ...minimal, city: { id: 3550308, name: 'São Paulo', state: 'SP' }, street: ' Rua A ', number: '12' }
    expect(errors(withAddress)).toEqual({})
    expect(toPropertyRequest(withAddress).address).toEqual({
      cityId: 3550308,
      street: 'Rua A',
      number: '12',
      complement: null,
      neighborhood: null,
      postalCode: null,
    })
  })

  it('asks for the financing terms only when a purchase is financed', () => {
    const financed = { ...minimal, acquisitionType: 'purchase' as const, hasFinancing: true }
    expect(errors(financed)).toEqual({
      financedAmount: 'Informe o valor financiado.',
      termMonths: 'Informe o prazo em meses.',
      annualInterestRate: 'Informe os juros ao ano.',
      firstInstallmentOn: 'Informe a data da primeira parcela.',
    })
    // An inheritance cannot be financed, so the switch left on is ignored.
    const inherited = { ...financed, acquisitionType: 'inheritance' as const, acquiredOn: '01/02/2010' }
    expect(errors(inherited)).toEqual({})
    expect(toPropertyRequest(inherited).financing).toBeNull()
  })

  it('needs the base date of an inheritance', () => {
    expect(errors({ ...minimal, acquisitionType: 'inheritance' })).toEqual({ acquiredOn: 'Uma herança precisa da data base.' })
  })

  it('drops rent data where it does not apply', () => {
    const ownUse = { ...minimal, usageType: 'own_use' as const, rentalMode: 'contract' as const, monthlyRent: 'abc' }
    expect(errors(ownUse)).toEqual({})
    expect(toPropertyRequest(ownUse)).toMatchObject({ rentalMode: 'manual', manualRental: null })
    expect(toPropertyRequest({ ...minimal, rentalMode: 'contract', monthlyRent: '1.000' }).manualRental).toBeNull()
    expect(toPropertyRequest({ ...minimal, propertyType: 'residential', parkingSpotLabel: 'G2' }).parkingSpotLabel).toBeNull()
  })

  it('turns a stored property into form text and back into the same request', () => {
    const property = makePropertyRecord({
      ownershipPercentage: 50,
      estimatedValueCents: 68_000_050,
      manualRental: null,
      rentalMode: 'contract',
      financing: {
        lender: 'Caixa',
        financedAmountCents: 36_000_000,
        termMonths: 360,
        annualInterestRate: 9.5,
        amortizationSystem: 'price',
        firstInstallmentOn: '2021-06-13',
      },
      legalRecord: { registrationStatus: 'irregular', irregularityDescription: 'Averbação', registryNumber: '1', registryOffice: null, notes: 'n' },
      insurance: { description: null },
    })
    const values = fromProperty(property)
    expect(values).toMatchObject({
      ownershipPercentage: '50',
      estimatedValue: '680.000,50',
      acquiredOn: '14/05/2021',
      termMonths: '360',
      annualInterestRate: '9,5',
      city: { id: 3550308, name: 'São Paulo', state: 'SP' },
    })
    expect(errors(values)).toEqual({})
    expect(toPropertyRequest(values)).toEqual({
      name: property.name,
      propertyType: property.propertyType,
      subtypeId: property.subtypeId,
      usageType: property.usageType,
      ownershipPercentage: 50,
      address: {
        cityId: 3550308,
        street: 'Avenida Paulista',
        number: '1500',
        complement: 'apto 82',
        neighborhood: 'Bela Vista',
        postalCode: '01310-100',
      },
      totalArea: 78,
      privateArea: 65,
      bedrooms: 2,
      suites: null,
      bathrooms: 2,
      parkingSpaces: 1,
      parkingSpotLabel: null,
      builtYear: 2012,
      conservationState: 'good',
      estimatedValueCents: 68_000_050,
      annualExpensesCents: 540_000,
      occupancyRate: 95,
      forSale: null,
      rentalMode: 'contract',
      manualRental: null,
      acquisition: { acquisitionType: 'purchase', acquiredOn: '2021-05-14', costCents: 52_000_000 },
      financing: property.financing,
      legalRecord: property.legalRecord,
      insurance: { description: null },
      clientId: null,
      agencyId: null,
      notes: null,
    })
  })

  it('asks for a price above zero when the property is for sale, and sends it with the consent', () => {
    const forSale = { ...minimal, forSale: true }
    expect(errors(forSale)).toEqual({ salePrice: 'Informe o preço de venda.' })
    expect(errors({ ...forSale, salePrice: '0,00' })).toEqual({ salePrice: 'O preço precisa ser maior que zero.' })
    expect(errors({ ...forSale, salePrice: '450,123' })).toEqual({ salePrice: 'Use um valor como 450.000,00.' })

    const priced = { ...forSale, salePrice: '450.000,50' }
    expect(errors(priced)).toEqual({})
    expect(toPropertyRequest(priced).forSale).toEqual({ priceCents: 45_000_050, consent: true })
  })

  it('ignores a price typed before the switch was turned off', () => {
    const off = { ...minimal, forSale: false, salePrice: 'abc' }
    expect(errors(off)).toEqual({})
    expect(toPropertyRequest(off).forSale).toBeNull()
  })

  it('brings a property already for sale back with the switch on and its price', () => {
    const property = makePropertyRecord({
      forSale: { priceCents: 45_000_000, consentedAt: '2026-11-01T10:00:00.000Z', status: 'live', missing: [] },
    })
    const values = fromProperty(property)
    expect(values).toMatchObject({ forSale: true, salePrice: '450.000,00' })
    expect(toPropertyRequest(values).forSale).toEqual({ priceCents: 45_000_000, consent: true })
    expect(fromProperty(makePropertyRecord())).toMatchObject({ forSale: false, salePrice: '' })
  })

  it('lists what the form already knows a listing lacks', () => {
    expect(listingGaps(minimal)).toEqual(['address', 'area'])
    const city = { id: 3550308, name: 'São Paulo', state: 'SP' }
    expect(listingGaps({ ...minimal, city, street: 'Rua A', neighborhood: ' ', totalArea: '60' })).toEqual(['address'])
    expect(listingGaps({ ...minimal, city, neighborhood: 'Centro', privateArea: '0', totalArea: '' })).toEqual(['area'])
    expect(listingGaps({ ...minimal, city, neighborhood: 'Centro', totalArea: '60' })).toEqual([])
  })

  it('translates the rule messages the API sends', () => {
    expect(apiMessageInPortuguese('This usage is not allowed for the property type')).toBe('Este uso não vale para o tipo escolhido.')
    expect(apiMessageInPortuguese('Something new')).toBe('A API recusou este valor. Revise e tente de novo.')
  })
})
