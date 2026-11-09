import { z } from 'zod'
import type { Schemas } from '@/lib/api/client'
import {
  dateToInput,
  decimalToInput,
  moneyToInput,
  parseDate,
  parseDecimal,
  parseInteger,
  parseMoney,
} from '@/lib/parse'
import type { Property, PropertyCatalog } from '../api/queries'
import type { PropertyType, UsageType } from './labels'

export type PropertyRequest = Schemas['CreatePropertyRequest']
type Acquisition = NonNullable<Property['acquisition']>['acquisitionType']
type Conservation = NonNullable<Property['conservationState']>

export interface CityOption {
  id: number
  name: string
  state: string
}

/** What the form holds: text as typed, so a half-written number is never lost. */
export interface PropertyFormValues {
  name: string
  propertyType: PropertyType | ''
  subtypeId: string
  usageType: UsageType | ''
  ownershipPercentage: string
  city: CityOption | null
  street: string
  number: string
  complement: string
  neighborhood: string
  postalCode: string
  totalArea: string
  privateArea: string
  bedrooms: string
  suites: string
  bathrooms: string
  parkingSpaces: string
  parkingSpotLabel: string
  builtYear: string
  conservationState: Conservation | ''
  estimatedValue: string
  annualExpenses: string
  occupancyRate: string
  forSale: boolean
  salePrice: string
  rentalMode: 'manual' | 'contract'
  tenantName: string
  monthlyRent: string
  dueDay: string
  acquisitionType: Acquisition | ''
  acquiredOn: string
  acquisitionCost: string
  hasFinancing: boolean
  lender: string
  financedAmount: string
  termMonths: string
  annualInterestRate: string
  amortizationSystem: 'sac' | 'price'
  firstInstallmentOn: string
  registrationStatus: 'regular' | 'irregular' | ''
  irregularityDescription: string
  registryNumber: string
  registryOffice: string
  registryNotes: string
  insured: boolean
  insuranceDescription: string
  clientId: string
  agencyId: string
  notes: string
}

export const EMPTY_PROPERTY_FORM: PropertyFormValues = {
  name: '',
  propertyType: '',
  subtypeId: '',
  usageType: '',
  ownershipPercentage: '100',
  city: null,
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  postalCode: '',
  totalArea: '',
  privateArea: '',
  bedrooms: '',
  suites: '',
  bathrooms: '',
  parkingSpaces: '',
  parkingSpotLabel: '',
  builtYear: '',
  conservationState: '',
  estimatedValue: '',
  annualExpenses: '',
  occupancyRate: '90',
  forSale: false,
  salePrice: '',
  rentalMode: 'manual',
  tenantName: '',
  monthlyRent: '',
  dueDay: '',
  acquisitionType: '',
  acquiredOn: '',
  acquisitionCost: '',
  hasFinancing: false,
  lender: '',
  financedAmount: '',
  termMonths: '',
  annualInterestRate: '',
  amortizationSystem: 'sac',
  firstInstallmentOn: '',
  registrationStatus: '',
  irregularityDescription: '',
  registryNumber: '',
  registryOffice: '',
  registryNotes: '',
  insured: false,
  insuranceDescription: '',
  clientId: '',
  agencyId: '',
  notes: '',
}

/** Usages that produce no income: no rent to describe. */
export function earnsIncome(usage: UsageType | '') {
  return usage !== 'own_use' && usage !== 'loan_for_use'
}

/** Only a purchase or a construction can be financed. */
export function canBeFinanced(acquisition: Acquisition | '') {
  return acquisition === 'purchase' || acquisition === 'construction'
}

const ADDRESS_FIELDS = ['street', 'number', 'complement', 'neighborhood', 'postalCode'] as const

function hasAddress(values: PropertyFormValues) {
  return values.city !== null || ADDRESS_FIELDS.some((field) => values[field].trim() !== '')
}

/** What a listing still needs that the form can see; the photos are only known once the property exists. */
export type ListingGap = 'address' | 'area'

export function listingGaps(values: PropertyFormValues): ListingGap[] {
  const gaps: ListingGap[] = []
  if (!values.city || values.neighborhood.trim() === '') gaps.push('address')
  const area = parseDecimal(values.privateArea) ?? parseDecimal(values.totalArea)
  if (!area || area <= 0) gaps.push('area')
  return gaps
}

export function fromProperty(property: Property): PropertyFormValues {
  const { address, manualRental, acquisition, financing, legalRecord, insurance } = property
  return {
    name: property.name,
    propertyType: property.propertyType,
    subtypeId: property.subtypeId === null ? '' : String(property.subtypeId),
    usageType: property.usageType,
    ownershipPercentage: decimalToInput(property.ownershipPercentage),
    city: address ? { id: address.cityId, name: address.city, state: address.state } : null,
    street: address?.street ?? '',
    number: address?.number ?? '',
    complement: address?.complement ?? '',
    neighborhood: address?.neighborhood ?? '',
    postalCode: address?.postalCode ?? '',
    totalArea: decimalToInput(property.totalArea),
    privateArea: decimalToInput(property.privateArea),
    bedrooms: decimalToInput(property.bedrooms),
    suites: decimalToInput(property.suites),
    bathrooms: decimalToInput(property.bathrooms),
    parkingSpaces: decimalToInput(property.parkingSpaces),
    parkingSpotLabel: property.parkingSpotLabel ?? '',
    builtYear: decimalToInput(property.builtYear),
    conservationState: property.conservationState ?? '',
    estimatedValue: moneyToInput(property.estimatedValueCents),
    annualExpenses: moneyToInput(property.annualExpensesCents),
    occupancyRate: decimalToInput(property.occupancyRate),
    forSale: property.forSale !== null,
    salePrice: moneyToInput(property.forSale?.priceCents),
    rentalMode: property.rentalMode,
    tenantName: manualRental?.tenantName ?? '',
    monthlyRent: moneyToInput(manualRental?.monthlyRentCents),
    dueDay: decimalToInput(manualRental?.dueDay),
    acquisitionType: acquisition?.acquisitionType ?? '',
    acquiredOn: dateToInput(acquisition?.acquiredOn),
    acquisitionCost: moneyToInput(acquisition?.costCents),
    hasFinancing: financing !== null,
    lender: financing?.lender ?? '',
    financedAmount: moneyToInput(financing?.financedAmountCents),
    termMonths: decimalToInput(financing?.termMonths),
    annualInterestRate: decimalToInput(financing?.annualInterestRate),
    amortizationSystem: financing?.amortizationSystem ?? 'sac',
    firstInstallmentOn: dateToInput(financing?.firstInstallmentOn),
    registrationStatus: legalRecord?.registrationStatus ?? '',
    irregularityDescription: legalRecord?.irregularityDescription ?? '',
    registryNumber: legalRecord?.registryNumber ?? '',
    registryOffice: legalRecord?.registryOffice ?? '',
    registryNotes: legalRecord?.notes ?? '',
    insured: insurance !== null,
    insuranceDescription: insurance?.description ?? '',
    clientId: property.clientId ?? '',
    agencyId: property.agencyId ?? '',
    notes: property.notes ?? '',
  }
}

// --- validation -------------------------------------------------------------

type Check = (text: string) => string | null

function rangeCheck(parse: (t: string) => number | null | undefined, min: number, max: number, unreadable: string): Check {
  return (text) => {
    const value = parse(text)
    if (value === null) return null
    if (value === undefined) return unreadable
    if (value < min || value > max) return `Use um valor entre ${min.toLocaleString('pt-BR')} e ${max.toLocaleString('pt-BR')}.`
    return null
  }
}

const count = rangeCheck(parseInteger, 0, 999, 'Use um número inteiro.')
const area = rangeCheck(parseDecimal, 0, 9_999_999_999, 'Use só números, como 62,5.')
const money: Check = (text) => {
  const value = parseMoney(text)
  if (value === undefined) return 'Use um valor como 1.234,56.'
  if (value !== null && value < 0) return 'O valor não pode ser negativo.'
  return null
}
const date: Check = (text) => (parseDate(text) === undefined ? 'Use uma data válida, como 14/05/2021.' : null)

/** Built per catalog so the usage can be checked against the property type. */
export function propertyFormSchema(catalog: PropertyCatalog | undefined) {
  return z.custom<PropertyFormValues>().superRefine((values, ctx) => {
    const issue = (path: keyof PropertyFormValues, message: string | null) => {
      if (message) ctx.addIssue({ code: 'custom', path: [path], message })
    }
    const required = (path: keyof PropertyFormValues, message: string) => {
      const value = values[path]
      if (typeof value === 'string' && value.trim() === '') issue(path, message)
    }

    if (values.name.trim().length < 2) issue('name', 'Dê um nome com pelo menos 2 letras.')
    required('propertyType', 'Escolha o tipo do imóvel.')
    required('usageType', 'Escolha o uso do imóvel.')
    const allowed = catalog?.find((entry) => entry.propertyType === values.propertyType)?.usageTypes
    if (values.usageType && allowed && !allowed.includes(values.usageType)) {
      issue('usageType', 'Este uso não vale para o tipo escolhido.')
    }

    const ownership = parseDecimal(values.ownershipPercentage)
    if (ownership === null) issue('ownershipPercentage', 'Informe a participação.')
    else if (ownership === undefined || ownership <= 0 || ownership > 100) {
      issue('ownershipPercentage', 'Use um percentual acima de 0 e até 100.')
    }

    if (hasAddress(values)) {
      if (!values.city) issue('city', 'Escolha a cidade.')
      required('street', 'Informe a rua.')
      const postal = values.postalCode.replace(/\D/g, '')
      if (values.postalCode.trim() && postal.length !== 8) issue('postalCode', 'O CEP tem 8 dígitos.')
    }

    for (const field of ['totalArea', 'privateArea'] as const) issue(field, area(values[field]))
    for (const field of ['bedrooms', 'suites', 'bathrooms', 'parkingSpaces'] as const) issue(field, count(values[field]))
    issue('builtYear', rangeCheck(parseInteger, 1500, 2200, 'Use um ano, como 2012.')(values.builtYear))

    issue('estimatedValue', money(values.estimatedValue))
    issue('annualExpenses', money(values.annualExpenses))
    const occupancy = parseDecimal(values.occupancyRate)
    if (occupancy === null) issue('occupancyRate', 'Informe a ocupação esperada.')
    else if (occupancy === undefined || occupancy < 0 || occupancy > 100) issue('occupancyRate', 'Use um percentual de 0 a 100.')

    if (earnsIncome(values.usageType) && values.rentalMode === 'manual') {
      issue('monthlyRent', money(values.monthlyRent))
      issue('dueDay', rangeCheck(parseInteger, 1, 31, 'Use um dia do mês.')(values.dueDay))
    }

    if (values.forSale) {
      const price = parseMoney(values.salePrice)
      if (price === null) issue('salePrice', 'Informe o preço de venda.')
      else if (price === undefined) issue('salePrice', 'Use um valor como 450.000,00.')
      else if (price <= 0) issue('salePrice', 'O preço precisa ser maior que zero.')
    }

    if (values.acquisitionType) {
      issue('acquiredOn', date(values.acquiredOn))
      issue('acquisitionCost', money(values.acquisitionCost))
      if (values.acquisitionType === 'inheritance' && !values.acquiredOn.trim()) {
        issue('acquiredOn', 'Uma herança precisa da data base.')
      }
    }

    if (values.hasFinancing && canBeFinanced(values.acquisitionType)) {
      const amount = parseMoney(values.financedAmount)
      if (amount === null) issue('financedAmount', 'Informe o valor financiado.')
      else if (amount === undefined || amount < 1) issue('financedAmount', 'Use um valor como 360.000,00.')
      const term = parseInteger(values.termMonths)
      if (term === null) issue('termMonths', 'Informe o prazo em meses.')
      else issue('termMonths', rangeCheck(parseInteger, 1, 1200, 'Use um número de meses.')(values.termMonths))
      if (parseDecimal(values.annualInterestRate) === null) issue('annualInterestRate', 'Informe os juros ao ano.')
      else issue('annualInterestRate', rangeCheck(parseDecimal, 0, 999.9999, 'Use um percentual, como 9,5.')(values.annualInterestRate))
      if (!values.firstInstallmentOn.trim()) issue('firstInstallmentOn', 'Informe a data da primeira parcela.')
      else issue('firstInstallmentOn', date(values.firstInstallmentOn))
    }
  })
}

// --- request ------------------------------------------------------------------

const text = (value: string) => (value.trim() === '' ? null : value.trim())
const num = <T,>(value: T | null | undefined): T | null => value ?? null

/** The body for POST (create) and PATCH (edit): every field is sent, null clears it. */
export function toPropertyRequest(values: PropertyFormValues): PropertyRequest {
  const income = earnsIncome(values.usageType)
  const manual = income && values.rentalMode === 'manual'
  const financed = values.hasFinancing && canBeFinanced(values.acquisitionType)
  const legalFilled =
    values.registrationStatus !== '' ||
    [values.registryNumber, values.registryOffice, values.registryNotes].some((v) => v.trim() !== '')

  return {
    name: values.name.trim(),
    propertyType: values.propertyType as PropertyType,
    subtypeId: values.subtypeId ? Number(values.subtypeId) : null,
    usageType: values.usageType as UsageType,
    ownershipPercentage: parseDecimal(values.ownershipPercentage) ?? 100,
    address:
      hasAddress(values) && values.city
        ? {
            cityId: values.city.id,
            street: values.street.trim(),
            number: text(values.number),
            complement: text(values.complement),
            neighborhood: text(values.neighborhood),
            postalCode: text(values.postalCode),
          }
        : null,
    totalArea: num(parseDecimal(values.totalArea)),
    privateArea: num(parseDecimal(values.privateArea)),
    bedrooms: num(parseInteger(values.bedrooms)),
    suites: num(parseInteger(values.suites)),
    bathrooms: num(parseInteger(values.bathrooms)),
    parkingSpaces: num(parseInteger(values.parkingSpaces)),
    parkingSpotLabel: values.propertyType === 'parking' ? text(values.parkingSpotLabel) : null,
    builtYear: num(parseInteger(values.builtYear)),
    conservationState: values.conservationState || null,
    estimatedValueCents: num(parseMoney(values.estimatedValue)),
    annualExpensesCents: parseMoney(values.annualExpenses) ?? 0,
    occupancyRate: parseDecimal(values.occupancyRate) ?? 0,
    forSale: values.forSale ? { priceCents: parseMoney(values.salePrice) ?? 0, consent: true } : null,
    rentalMode: income ? values.rentalMode : 'manual',
    manualRental: manual
      ? {
          tenantName: text(values.tenantName),
          monthlyRentCents: parseMoney(values.monthlyRent) ?? 0,
          dueDay: num(parseInteger(values.dueDay)),
        }
      : null,
    acquisition: values.acquisitionType
      ? {
          acquisitionType: values.acquisitionType,
          acquiredOn: num(parseDate(values.acquiredOn)),
          costCents: num(parseMoney(values.acquisitionCost)),
        }
      : null,
    financing: financed
      ? {
          lender: text(values.lender),
          financedAmountCents: parseMoney(values.financedAmount) ?? 0,
          termMonths: parseInteger(values.termMonths) ?? 0,
          annualInterestRate: parseDecimal(values.annualInterestRate) ?? 0,
          amortizationSystem: values.amortizationSystem,
          firstInstallmentOn: parseDate(values.firstInstallmentOn) ?? '',
        }
      : null,
    legalRecord: legalFilled
      ? {
          registrationStatus: values.registrationStatus || 'regular',
          irregularityDescription: values.registrationStatus === 'irregular' ? text(values.irregularityDescription) : null,
          registryNumber: text(values.registryNumber),
          registryOffice: text(values.registryOffice),
          notes: text(values.registryNotes),
        }
      : null,
    insurance: values.insured ? { description: text(values.insuranceDescription) } : null,
    clientId: values.clientId || null,
    agencyId: values.agencyId || null,
    notes: text(values.notes),
  }
}

/**
 * The API names fields by their path in the request; this maps them onto the form so
 * an error lands under the right input. Anything else is shown at the top of the form.
 */
export const REQUEST_PATH_TO_FIELD: Record<string, keyof PropertyFormValues> = {
  name: 'name',
  propertyType: 'propertyType',
  subtypeId: 'subtypeId',
  usageType: 'usageType',
  ownershipPercentage: 'ownershipPercentage',
  'address.cityId': 'city',
  'address.street': 'street',
  'address.postalCode': 'postalCode',
  'forSale.priceCents': 'salePrice',
  'forSale.consent': 'forSale',
  parkingSpotLabel: 'parkingSpotLabel',
  clientId: 'clientId',
  agencyId: 'agencyId',
  'acquisition.acquiredOn': 'acquiredOn',
  financing: 'hasFinancing',
  manualRental: 'monthlyRent',
  irregularityDescription: 'irregularityDescription',
  'legalRecord.irregularityDescription': 'irregularityDescription',
}

/** The API's own words (in English) for the rules it checks, in the form's language. */
const API_MESSAGES: Record<string, string> = {
  'This usage is not allowed for the property type': 'Este uso não vale para o tipo escolhido.',
  'This subtype does not belong to the property type': 'Este subtipo não é do tipo escolhido.',
  'Only parking properties have a parking spot label': 'Só vagas de garagem têm identificação da vaga.',
  'Manual rental data is only used in manual rental mode': 'O aluguel informado só vale quando o aluguel não vem de contrato.',
  'A financing needs an acquisition by purchase or construction': 'Só compra ou construção podem ter financiamento.',
  'An inheritance needs a base date': 'Uma herança precisa da data base.',
  'Agency not found': 'Esta imobiliária não existe mais.',
  'Client not found': 'Este cliente não existe mais.',
  'City not found': 'Esta cidade não foi encontrada.',
  'A sale price greater than zero is required': 'O preço precisa ser maior que zero.',
  'The owner must consent to publish the property as a listing': 'Confirme que o imóvel pode aparecer como anúncio.',
}

export function apiMessageInPortuguese(message: string): string {
  return API_MESSAGES[message] ?? 'A API recusou este valor. Revise e tente de novo.'
}
