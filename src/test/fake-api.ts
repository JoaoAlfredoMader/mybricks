import { vi } from 'vitest'
import type { Session } from '@/features/auth/api/session'
import type { Agency, Client } from '@/features/clients/api/queries'
import type { Contract, CreateContractRequest } from '@/features/contracts/api/queries'
import type { ContractTemplate } from '@/features/contracts/api/template'
import type { CashFlow, CreateTransactionRequest, Transaction, TransactionCategory } from '@/features/finances/api/queries'
import type { Occupant } from '@/features/occupants/api/queries'
import type { CreateReservationRequest, Reservation } from '@/features/reservations/api/queries'
import type { PortfolioKpis, PropertyKpis } from '@/features/dashboard/api/portfolio-kpis'
import type { Listing } from '@/features/listings/api/queries'
import type { Photo, PropertyDocument } from '@/features/properties/api/files'
import type { FinancingSchedule, Property, PropertyCatalog } from '@/features/properties/api/queries'
import type { PropertyRequest as PropertyRequestBody } from '@/features/properties/lib/property-form'

export function makeSession(overrides: Partial<Omit<Session, 'user'>> & { user?: Partial<Session['user']> } = {}): Session {
  const { user, ...rest } = overrides
  return {
    sessionId: 'session-1',
    impersonatedById: null,
    organizationId: 'org-1',
    memberRole: 'owner',
    ...rest,
    user: { id: 'user-1', name: 'Ana Souza', email: 'ana@example.com', isAnonymous: false, platformRole: 'user', ...user },
  }
}

export function makeProperty(overrides: Partial<PropertyKpis> = {}): PropertyKpis {
  return {
    propertyId: crypto.randomUUID(),
    name: 'Apartamento Centro',
    clientId: null,
    usageType: 'rental',
    status: 'rented',
    ownershipPercentage: 100,
    estimatedValueCents: 68_000_000,
    revenueSource: 'contract',
    monthlyRentCents: 361_000,
    includedInPortfolio: true,
    annualRevenueCents: 4_332_000,
    annualExpensesCents: 540_000,
    noiCents: 3_792_000,
    grossYield: 0.063706,
    capRate: 0.055765,
    irr: { annualRate: 0.031893, unavailableReason: null, months: 60 },
    ...overrides,
  }
}

export function makeKpis(overrides: Partial<PortfolioKpis> = {}): PortfolioKpis {
  return {
    asOf: '2026-11-04',
    totals: {
      totalValueCents: 657_000_000,
      incomeProducingValueCents: 591_500_000,
      annualRevenueCents: 38_470_000,
      annualExpensesCents: 5_964_000,
      noiCents: 32_506_000,
      grossYield: 0.065038,
      capRate: 0.054955,
    },
    propertyCount: 3,
    propertiesByStatus: { rented: 2, vacant: 0, own_use: 1, loan_for_use: 0 },
    properties: [
      makeProperty(),
      makeProperty({ name: 'Galpão Logístico', estimatedValueCents: 280_000_000, noiCents: 19_200_000 }),
      makeProperty({
        name: 'Casa de Praia',
        usageType: 'own_use',
        status: 'own_use',
        ownershipPercentage: 50,
        includedInPortfolio: false,
        estimatedValueCents: 95_000_000,
        annualRevenueCents: 0,
        noiCents: -800_000,
        grossYield: null,
        capRate: null,
        irr: { annualRate: null, unavailableReason: 'no_acquisition_cost', months: null },
      }),
    ],
    ...overrides,
  }
}

type Handler = (request: Request) => Response | Promise<Response>

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

let propertySeq = 0

/** A full property record, as GET /api/properties/{id} returns it. */
export function makePropertyRecord(overrides: Partial<Property> = {}): Property {
  propertySeq += 1
  return {
    id: `00000000-0000-4000-8000-${String(propertySeq).padStart(12, '0')}`,
    name: 'Apartamento Centro',
    propertyType: 'residential',
    subtypeId: 1,
    usageType: 'rental',
    status: 'rented',
    ownershipPercentage: 100,
    totalArea: 78,
    privateArea: 65,
    bedrooms: 2,
    suites: null,
    bathrooms: 2,
    parkingSpaces: 1,
    parkingSpotLabel: null,
    builtYear: 2012,
    conservationState: 'good',
    estimatedValueCents: 68_000_000,
    annualExpensesCents: 540_000,
    occupancyRate: 95,
    forSale: null,
    rentalMode: 'contract',
    notes: null,
    clientId: null,
    agencyId: null,
    agencyName: null,
    address: {
      cityId: 3550308,
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310-100',
      street: 'Avenida Paulista',
      number: '1500',
      complement: 'apto 82',
      neighborhood: 'Bela Vista',
      latitude: null,
      longitude: null,
    },
    manualRental: null,
    acquisition: { acquisitionType: 'purchase', acquiredOn: '2021-05-14', costCents: 52_000_000 },
    financing: null,
    legalRecord: null,
    insurance: null,
    createdById: 'user-1',
    createdAt: '2026-11-04T12:00:00.000Z',
    updatedAt: '2026-11-04T12:00:00.000Z',
    ...overrides,
  }
}


let listingSeq = 0

/** One public listing as GET /api/listings sends it: a two-bedroom apartment with every field filled in. */
export function makeListing(overrides: Partial<Listing> = {}): Listing {
  listingSeq += 1
  const id = `00000000-0000-4000-8000-${String(900_000 + listingSeq).padStart(12, '0')}`
  return {
    id,
    reference: id.slice(0, 8).toUpperCase(),
    propertyType: 'residential',
    subtypeName: 'Apartamento',
    salePriceCents: 45_000_000,
    area: { value: 62.5, unit: 'm2' },
    bedrooms: 2,
    suites: 1,
    bathrooms: 2,
    parkingSpaces: 1,
    builtYear: 2012,
    conservationState: 'good',
    city: 'Florianópolis',
    state: 'SC',
    neighborhood: 'Centro',
    photoCount: 3,
    coverPhotoUrl: `/api/listings/${id}/cover`,
    listedAt: '2026-11-01T15:00:00.000Z',
    ...overrides,
  }
}

/** A few of the API's categories: the category decides revenue or expense. */
export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  { id: 4, transactionType: 'revenue', name: 'Indenização' },
  { id: 1, transactionType: 'revenue', name: 'Venda de imóvel' },
  { id: 8, transactionType: 'expense', name: 'Obra' },
  { id: 6, transactionType: 'expense', name: 'Parcela de financiamento' },
  { id: 7, transactionType: 'expense', name: 'Reforma' },
]

/** What a test says about one month of the cash flow; the rest is zero. Amounts in cents. */
interface MonthFigures {
  rent?: number
  reservations?: number
  revenueTransactions?: number
  fixed?: number
  expenseTransactions?: number
}

/**
 * GET /api/kpis/cash-flow: one item per month from `from` to `to` (YYYY-MM, both included), every
 * figure zero unless `figures` gives it, with the totals added up like the API does.
 */
export function makeCashFlow(from: string, to: string, figures: Record<string, MonthFigures> = {}): CashFlow {
  const start = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7)) - 1
  const end = Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7)) - 1
  const months = Array.from({ length: end - start + 1 }, (_, offset) => {
    const index = start + offset
    const month = `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
    const { rent = 0, reservations = 0, revenueTransactions = 0, fixed = 0, expenseTransactions = 0 } = figures[month] ?? {}
    const revenue = rent + reservations + revenueTransactions
    const expenses = fixed + expenseTransactions
    return {
      month,
      revenue: { rentCents: rent, reservationsCents: reservations, transactionsCents: revenueTransactions, totalCents: revenue },
      expenses: { fixedCents: fixed, transactionsCents: expenseTransactions, totalCents: expenses },
      netCents: revenue - expenses,
    }
  })
  const revenueCents = months.reduce((total, m) => total + m.revenue.totalCents, 0)
  const expensesCents = months.reduce((total, m) => total + m.expenses.totalCents, 0)
  return { from, to, months, totals: { revenueCents, expensesCents, netCents: revenueCents - expensesCents } }
}

/** The tokens a contract template can use, as the API lists them. */
export const TEMPLATE_PLACEHOLDERS: ContractTemplate['placeholders'] = [
  { token: 'locador', description: 'Nome do locador' },
  { token: 'locatario', description: 'Nome do locatário' },
  { token: 'imovel', description: 'Nome do imóvel' },
  { token: 'valor_mensal', description: 'Valor mensal do aluguel, em reais' },
  { token: 'data_emissao', description: 'Data em que o PDF foi gerado, por extenso' },
]

/** A short default contract, as the API serves it until the organization saves its own. */
export const DEFAULT_TEMPLATE = {
  header: '<h1>CONTRATO DE LOCAÇÃO</h1>',
  clauses:
    '<p>Pelo presente instrumento, <strong>{{locador}}</strong> loca a <strong>{{locatario}}</strong> o imóvel {{imovel}}.</p><h2>Cláusula 1ª – Do aluguel</h2><p>O aluguel é de {{valor_mensal}}.</p>',
  footer: '<p><em>{{imovel}} – emitido em {{data_emissao}}</em></p>',
}

interface StoredTemplate {
  header: string
  clauses: string
  footer: string
  updatedAt: string
}

/** What the API tells the editor: the three parts, where they come from and the tokens that do not exist. */
function templateAnswer(stored: StoredTemplate | null): ContractTemplate {
  const parts = stored ?? DEFAULT_TEMPLATE
  const known = new Set(TEMPLATE_PLACEHOLDERS.map((p) => p.token))
  const unknown = new Set<string>()
  for (const text of [parts.header, parts.clauses, parts.footer]) {
    for (const match of text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)) if (!known.has(match[1]!)) unknown.add(match[1]!)
  }
  return {
    header: parts.header,
    clauses: parts.clauses,
    footer: parts.footer,
    isDefault: stored === null,
    updatedAt: stored?.updatedAt ?? null,
    updatedById: stored ? 'user-1' : null,
    placeholders: TEMPLATE_PLACEHOLDERS,
    unknownPlaceholders: [...unknown],
  }
}

let transactionSeq = 0

/** A transaction as GET /api/transactions/{id} returns it: a one-off renovation by default. */
export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  transactionSeq += 1
  return {
    id: `00000000-0000-4000-c000-${String(transactionSeq).padStart(12, '0')}`,
    propertyId: '00000000-0000-4000-8000-000000000001',
    propertyName: 'Apartamento Centro',
    categoryId: 7,
    categoryName: 'Reforma',
    type: 'expense',
    amountCents: 1_200_000,
    occurredOn: '2026-10-23',
    description: 'Pintura geral',
    isRecurring: false,
    recurrenceEndsOn: null,
    createdAt: '2026-10-23T12:00:00.000Z',
    updatedAt: '2026-10-23T12:00:00.000Z',
    ...overrides,
  }
}

let clientSeq = 0

/** A client as GET /api/clients/{id} returns it: an individual with a valid CPF by default. */
export function makeClient(overrides: Partial<Client> = {}): Client {
  clientSeq += 1
  return {
    id: `00000000-0000-4000-b000-${String(clientSeq).padStart(12, '0')}`,
    name: 'Marina Prado',
    personType: 'individual',
    document: '52998224725',
    email: 'marina@example.com',
    whatsapp: '11987654321',
    createdById: 'user-1',
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    ...overrides,
  }
}

let reservationSeq = 0

/** A reservation as GET /api/reservations/{id} returns it: a confirmed 5-night stay by default. */
export function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  reservationSeq += 1
  return {
    id: `00000000-0000-4000-a000-${String(reservationSeq).padStart(12, '0')}`,
    propertyId: '00000000-0000-4000-8000-000000000001',
    propertyName: 'Flat Beira-Mar',
    contractId: null,
    guest: { id: `guest-${reservationSeq}`, name: 'Carla Mendes', document: null, email: 'carla@example.com', phone: '11987654321' },
    checkIn: '2026-11-22',
    checkOut: '2026-11-27',
    nights: 5,
    totalAmountCents: 330_000,
    status: 'confirmed',
    notes: null,
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    ...overrides,
  }
}

/** Whole days between two YYYY-MM-DD dates. */
function nightsBetween(checkIn: string, checkOut: string) {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000)
}

let contractSeq = 0

/** A contract as GET /api/contracts/{id} returns it: a conventional, active one by default. */
export function makeContract(overrides: Partial<Contract> = {}): Contract {
  contractSeq += 1
  return {
    id: `00000000-0000-4000-9000-${String(contractSeq).padStart(12, '0')}`,
    propertyId: '00000000-0000-4000-8000-000000000001',
    propertyName: 'Apartamento Centro',
    contractType: 'conventional',
    status: 'active',
    startDate: '2026-01-08',
    endDate: '2028-01-07',
    notes: null,
    occupant: { id: `occupant-${contractSeq}`, name: 'Ana Carolina Souza', document: '39053344705', email: 'ana@example.com', phone: '11965432109' },
    rentTerms: { monthlyRentCents: 380_000, dueDay: 5, adjustmentIndex: 'igpm' },
    pdfUrl: null,
    createdAt: '2026-01-08T12:00:00.000Z',
    updatedAt: '2026-01-08T12:00:00.000Z',
    ...overrides,
  }
}

/** `YYYY-MM-DD` plus `months`, keeping the day (tests use days that every month has). */
function addMonths(day: string, months: number) {
  const total = Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1 + months
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}${day.slice(7)}`
}

/**
 * A SAC schedule with round numbers, so tests can read the amounts: R$ 12.000 in 24 months
 * at 1% a month by default, with `paid` installments already due on `asOf`.
 */
export function makeFinancingSchedule({
  financedAmountCents = 1_200_000,
  termMonths = 24,
  firstInstallmentOn = '2026-01-10',
  monthlyRate = 0.01,
  paid = 0,
}: { financedAmountCents?: number; termMonths?: number; firstInstallmentOn?: string; monthlyRate?: number; paid?: number } = {}): FinancingSchedule {
  const amortization = Math.round(financedAmountCents / termMonths)
  let balance = financedAmountCents
  const installments = Array.from({ length: termMonths }, (_, i) => {
    const interest = Math.round(balance * monthlyRate)
    const amortizationCents = i === termMonths - 1 ? balance : amortization
    balance -= amortizationCents
    return {
      number: i + 1,
      dueOn: addMonths(firstInstallmentOn, i),
      installmentCents: amortizationCents + interest,
      interestCents: interest,
      amortizationCents,
      balanceCents: balance,
    }
  })
  const done = installments.slice(0, paid)
  return {
    asOf: paid > 0 ? done.at(-1)!.dueOn : addMonths(firstInstallmentOn, -1),
    amortizationSystem: 'sac',
    financedAmountCents,
    termMonths,
    annualInterestRate: monthlyRate * 1200,
    summary: {
      paidInstallments: paid,
      remainingInstallments: termMonths - paid,
      outstandingBalanceCents: done.at(-1)?.balanceCents ?? financedAmountCents,
      totalPaidCents: done.reduce((sum, row) => sum + row.installmentCents, 0),
      totalInterestCents: installments.reduce((sum, row) => sum + row.interestCents, 0),
      nextInstallment: installments[paid] ?? null,
    },
    installments,
  }
}

const CATALOG: PropertyCatalog = [
  { propertyType: 'residential', subtypes: [{ id: 1, name: 'Apartamento' }, { id: 2, name: 'Casa' }], usageTypes: ['rental', 'own_use'] },
  { propertyType: 'land', subtypes: [], usageTypes: ['own_use', 'agricultural_lease'] },
  { propertyType: 'logistics', subtypes: [{ id: 9, name: 'Galpão logístico' }], usageTypes: ['rental'] },
]

const UNAUTHENTICATED = { error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }
const NOT_FOUND = { error: { code: 'NOT_FOUND', message: 'Not found' } }

const CITIES = [
  { ibgeCode: 3550308, name: 'São Paulo', state: 'SP' },
  { ibgeCode: 3548500, name: 'Santos', state: 'SP' },
  { ibgeCode: 3509502, name: 'Campinas', state: 'SP' },
]

interface FakeApiOptions {
  session?: Session | null
  kpis?: PortfolioKpis
  properties?: Property[]
  /** Only the id and the name are needed; the rest is filled in like a typical client. */
  clients?: (Partial<Client> & { id: string; name: string })[]
  agencies?: Agency[]
  /** By property id. */
  photos?: Record<string, Photo[]>
  documents?: Record<string, PropertyDocument[]>
  contracts?: Contract[]
  reservations?: Reservation[]
  /** The organization's own contract template; without it the API answers with the default. */
  template?: { header: string; clauses: string; footer: string }
  transactions?: Transaction[]
  /** Tenants and guests on file, for GET /api/occupants. */
  occupants?: Occupant[]
  /** The public listings; the platform's WhatsApp is the one the real API sends. */
  listings?: Listing[]
  handlers?: Record<string, Handler>
}

/**
 * Stubs fetch with a tiny in-memory API: /api/me answers the current session, the
 * dashboard reads `kpis`, the property screens read `properties` (searched, filtered and
 * paged like the real list), and the endpoints given in `handlers` (keyed by "METHOD /path")
 * win over the defaults.
 */
export function fakeApi({
  session = null,
  kpis = makeKpis(),
  properties = [],
  clients = [],
  agencies = [],
  photos = {},
  documents = {},
  contracts = [],
  reservations = [],
  template,
  transactions = [],
  occupants = [],
  listings = [],
  handlers = {},
}: FakeApiOptions = {}) {
  const state = {
    session,
    kpis,
    properties,
    photos,
    documents,
    contracts,
    reservations,
    template: template ? { ...template, updatedAt: '2026-10-01T12:00:00.000Z' } : (null as StoredTemplate | null),
    transactions,
    occupants,
    clients: clients.map((client) => makeClient(client)),
    agencies: [...agencies],
  }
  const calls: { method: string; path: string; query: URLSearchParams; body: unknown }[] = []
  let fileSeq = 0

  /** Photos and documents of a property, kept in `state.photos` / `state.documents` by property id. */
  function files(method: string, pathname: string, body: unknown): Response | undefined {
    const match = /^\/api\/properties\/([^/]+)\/(photos|documents)(?:\/([^/]+))?$/.exec(pathname)
    if (!match) return undefined
    const [, propertyId, kind, rest] = match as unknown as [string, string, 'photos' | 'documents', string | undefined]
    const list = (kind === 'photos' ? state.photos : state.documents) as Record<string, (Photo | PropertyDocument)[]>
    const current = list[propertyId!] ?? []

    if (method === 'GET' && !rest) return json(current)
    if (method === 'POST' && !rest) {
      const { file, category } = body as { file: File; category?: string }
      fileSeq += 1
      const id = `file-${fileSeq}`
      const base = {
        id,
        propertyId: propertyId!,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        contentUrl: `${pathname}/${id}/content`,
        createdAt: '2026-11-04T12:00:00.000Z',
      }
      const created = kind === 'photos' ? { ...base, position: current.length } : { ...base, category: category ?? null }
      list[propertyId!] = [...current, created as Photo & PropertyDocument]
      return json(created, 201)
    }
    if (method === 'PUT' && rest === 'order') {
      const { photoIds } = body as { photoIds: string[] }
      list[propertyId!] = photoIds.map((id, position) => ({ ...current.find((p) => p.id === id)!, position }))
      return json(list[propertyId!])
    }
    if (method === 'PATCH' && rest) {
      list[propertyId!] = current.map((d) => (d.id === rest ? { ...d, ...(body as object) } : d))
      return json(list[propertyId!]!.find((d) => d.id === rest))
    }
    if (method === 'DELETE' && rest) {
      list[propertyId!] = current.filter((item) => item.id !== rest)
      return new Response(null, { status: 204 })
    }
    return undefined
  }

  /** Contracts and the occupants they name, kept in `state.contracts` / `state.occupants`. */
  function contractRoutes(method: string, pathname: string, query: URLSearchParams, body: unknown): Response | undefined {
    if (method === 'GET' && pathname === '/api/occupants') {
      const search = query.get('search')?.toLowerCase()
      const items = state.occupants.filter((o) => !search || o.name.toLowerCase().includes(search))
      return json({ items: items.slice(0, Number(query.get('pageSize') ?? 20)), page: 1, pageSize: 20, total: items.length })
    }
    if (method === 'GET' && pathname === '/api/contracts') {
      const page = Number(query.get('page') ?? 1)
      const pageSize = Number(query.get('pageSize') ?? 20)
      const matches = state.contracts
        .filter((c) => !query.get('propertyId') || c.propertyId === query.get('propertyId'))
        .filter((c) => !query.get('status') || c.status === query.get('status'))
        .filter((c) => !query.get('contractType') || c.contractType === query.get('contractType'))
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
      return json({ items: matches.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: matches.length })
    }
    if (method === 'POST' && pathname === '/api/contracts') {
      const request = body as CreateContractRequest
      const property = state.properties.find((p) => p.id === request.propertyId)
      if (!property) return json(NOT_FOUND, 404)
      if (property.rentalMode !== 'contract') {
        return json({ error: { code: 'BUSINESS_RULE', message: 'Switch the property to contract rental mode before creating contracts' } }, 422)
      }
      const occupant: Occupant =
        state.occupants.find((o) => o.id === request.occupantId) ??
        { id: `occupant-new-${state.occupants.length + 1}`, name: request.occupant!.name, document: request.occupant!.document ?? null, email: request.occupant!.email ?? null, phone: request.occupant!.phone ?? null }
      const replaced = state.contracts.find((c) => c.propertyId === property.id && c.status === 'active')
      if (replaced) Object.assign(replaced, { status: 'ended', endDate: request.startDate })
      const created = makeContract({
        propertyId: property.id,
        propertyName: property.name,
        contractType: request.contractType,
        startDate: request.startDate,
        endDate: request.endDate ?? null,
        notes: request.notes ?? null,
        occupant,
        rentTerms: request.rentTerms ? { ...request.rentTerms, adjustmentIndex: request.rentTerms.adjustmentIndex ?? null } : null,
      })
      state.contracts.push(created)
      return json({ ...created, replacedContractId: replaced?.id ?? null }, 201)
    }
    const match = /^\/api\/contracts\/([^/]+)(?:\/(end|cancel|pdf))?$/.exec(pathname)
    if (!match) return undefined
    const contract = state.contracts.find((c) => c.id === match[1])
    if (!contract) return json(NOT_FOUND, 404)
    const action = match[2]
    if (method === 'GET' && !action) return json(contract)
    const inactive = json({ error: { code: 'BUSINESS_RULE', message: 'Only active contracts can be changed' } }, 422)
    if (method === 'PATCH' && !action) {
      if (contract.status !== 'active') return inactive
      const { rentTerms, ...rest } = body as Partial<Contract>
      Object.assign(contract, rest, rentTerms ? { rentTerms: { ...contract.rentTerms, ...rentTerms } } : {})
      return json(contract)
    }
    if (method === 'POST' && action === 'end') {
      if (contract.status !== 'active') return inactive
      Object.assign(contract, { status: 'ended', endDate: (body as { endDate?: string }).endDate ?? contract.endDate })
      return json(contract)
    }
    if (method === 'POST' && action === 'cancel') {
      if (contract.status !== 'active') return inactive
      contract.status = 'cancelled'
      return json(contract)
    }
    if (method === 'POST' && action === 'pdf') {
      contract.pdfUrl = `/api/contracts/${contract.id}/pdf`
      return json({ contractId: contract.id, fileName: 'contrato.pdf', sizeBytes: 4932, generatedAt: '2026-11-05T12:00:00.000Z', url: contract.pdfUrl })
    }
    return undefined
  }

  /** Reservations, kept in `state.reservations`; two confirmed ones of a property cannot share a night. */
  function reservationRoutes(method: string, pathname: string, query: URLSearchParams, body: unknown): Response | undefined {
    if (method === 'GET' && pathname === '/api/reservations') {
      const page = Number(query.get('page') ?? 1)
      const pageSize = Number(query.get('pageSize') ?? 20)
      const matches = state.reservations
        .filter((r) => !query.get('propertyId') || r.propertyId === query.get('propertyId'))
        .filter((r) => !query.get('status') || r.status === query.get('status'))
        // The window [from, to): a stay is in it while it overlaps it, as the API's list does.
        .filter((r) => !query.get('from') || r.checkOut > query.get('from')!)
        .filter((r) => !query.get('to') || r.checkIn < query.get('to')!)
        .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
      return json({ items: matches.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: matches.length })
    }
    const clash = (propertyId: string, checkIn: string, checkOut: string, exceptId?: string) =>
      state.reservations.find(
        (r) => r.id !== exceptId && r.propertyId === propertyId && r.status === 'confirmed' && r.checkIn < checkOut && checkIn < r.checkOut,
      )
    const conflict = (other: Reservation) =>
      json(
        {
          error: {
            code: 'CONFLICT',
            message: 'The property already has a confirmed reservation in these dates',
            details: { reservationId: other.id, checkIn: other.checkIn, checkOut: other.checkOut },
          },
        },
        409,
      )
    if (method === 'POST' && pathname === '/api/reservations') {
      const request = body as CreateReservationRequest
      const property = state.properties.find((p) => p.id === request.propertyId)
      if (!property) return json(NOT_FOUND, 404)
      const other = clash(property.id, request.checkIn, request.checkOut)
      if (other) return conflict(other)
      const guest: Occupant =
        state.occupants.find((o) => o.id === request.occupantId) ??
        { id: `guest-new-${state.occupants.length + 1}`, name: request.occupant!.name, document: request.occupant!.document ?? null, email: request.occupant!.email ?? null, phone: request.occupant!.phone ?? null }
      const created = makeReservation({
        propertyId: property.id,
        propertyName: property.name,
        contractId: request.contractId ?? null,
        guest,
        checkIn: request.checkIn,
        checkOut: request.checkOut,
        nights: nightsBetween(request.checkIn, request.checkOut),
        totalAmountCents: request.totalAmountCents,
        notes: request.notes ?? null,
      })
      state.reservations.push(created)
      return json(created, 201)
    }
    const match = /^\/api\/reservations\/([^/]+)(?:\/(cancel))?$/.exec(pathname)
    if (!match) return undefined
    const reservation = state.reservations.find((r) => r.id === match[1])
    if (!reservation) return json(NOT_FOUND, 404)
    if (method === 'GET' && !match[2]) return json(reservation)
    const notConfirmed = json({ error: { code: 'BUSINESS_RULE', message: 'Only confirmed reservations can be changed' } }, 422)
    if (method === 'PATCH' && !match[2]) {
      if (reservation.status !== 'confirmed') return notConfirmed
      const patch = body as Partial<Reservation> & { totalAmountCents?: number }
      const checkIn = patch.checkIn ?? reservation.checkIn
      const checkOut = patch.checkOut ?? reservation.checkOut
      const other = clash(reservation.propertyId, checkIn, checkOut, reservation.id)
      if (other) return conflict(other)
      Object.assign(reservation, patch, { nights: nightsBetween(checkIn, checkOut) })
      return json(reservation)
    }
    if (method === 'POST' && match[2] === 'cancel') {
      if (reservation.status !== 'confirmed') return notConfirmed
      reservation.status = 'cancelled'
      return json(reservation)
    }
    return undefined
  }

  /**
   * Transactions, kept in `state.transactions`. Like the API's, the period keeps a recurring one while its
   * monthly run touches it (started by `to`, not ended before the month of `from`).
   */
  function transactionRoutes(method: string, pathname: string, query: URLSearchParams, body: unknown): Response | undefined {
    const categorized = (categoryId: number) => {
      const category = TRANSACTION_CATEGORIES.find((c) => c.id === categoryId)!
      return { categoryId, categoryName: category.name, type: category.transactionType }
    }
    if (method === 'GET' && pathname === '/api/transactions') {
      const page = Number(query.get('page') ?? 1)
      const pageSize = Number(query.get('pageSize') ?? 20)
      const from = query.get('from')
      const to = query.get('to')
      const matches = state.transactions
        .filter((t) => !query.get('propertyId') || t.propertyId === query.get('propertyId'))
        .filter((t) => !query.get('categoryId') || t.categoryId === Number(query.get('categoryId')))
        .filter((t) => !query.get('type') || t.type === query.get('type'))
        .filter((t) => !query.get('isRecurring') || String(t.isRecurring) === query.get('isRecurring'))
        .filter((t) => {
          if (!t.isRecurring) return (!from || t.occurredOn >= from) && (!to || t.occurredOn <= to)
          const started = !to || t.occurredOn <= to
          const notEnded = !from || t.recurrenceEndsOn === null || t.recurrenceEndsOn.slice(0, 7) >= from.slice(0, 7)
          return started && notEnded
        })
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
      return json({ items: matches.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: matches.length })
    }
    if (method === 'POST' && pathname === '/api/transactions') {
      const request = body as CreateTransactionRequest
      const property = state.properties.find((p) => p.id === request.propertyId)
      if (!property) return json(NOT_FOUND, 404)
      const created = makeTransaction({
        ...request,
        ...categorized(request.categoryId),
        propertyName: property.name,
        description: request.description ?? null,
        recurrenceEndsOn: request.recurrenceEndsOn ?? null,
      })
      state.transactions.push(created)
      return json(created, 201)
    }
    const match = /^\/api\/transactions\/([^/]+)$/.exec(pathname)
    if (!match) return undefined
    const transaction = state.transactions.find((t) => t.id === match[1])
    if (!transaction) return json(NOT_FOUND, 404)
    if (method === 'GET') return json(transaction)
    if (method === 'PATCH') {
      const patch = body as Partial<Transaction>
      return json(Object.assign(transaction, patch, patch.categoryId ? categorized(patch.categoryId) : {}))
    }
    if (method === 'DELETE') {
      state.transactions = state.transactions.filter((t) => t !== transaction)
      return new Response(null, { status: 204 })
    }
    return undefined
  }

  /** Clients and agencies; one that still has properties cannot be deleted (409, with the count). */
  function clientRoutes(method: string, pathname: string, query: URLSearchParams, body: unknown): Response | undefined {
    const page = Number(query.get('page') ?? 1)
    const pageSize = Number(query.get('pageSize') ?? 20)
    const paged = <T>(items: T[]) =>
      json({ items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length })
    const search = query.get('search')?.toLowerCase()
    const named = (item: { name: string }) => !search || item.name.toLowerCase().includes(search)
    const inUse = (message: string, properties: number) =>
      json({ error: { code: 'CONFLICT', message, details: { properties } } }, 409)

    if (method === 'GET' && pathname === '/api/clients') {
      const matches = state.clients
        .filter(named)
        .filter((c) => !query.get('personType') || c.personType === query.get('personType'))
        .sort((a, b) => a.name.localeCompare(b.name))
      return paged(matches)
    }
    if (method === 'POST' && pathname === '/api/clients') {
      const created = makeClient({ document: null, email: null, whatsapp: null, ...(body as Partial<Client>) })
      state.clients.push(created)
      return json(created, 201)
    }
    const client = /^\/api\/clients\/([^/]+)$/.exec(pathname)
    if (client) {
      const found = state.clients.find((c) => c.id === client[1])
      if (!found) return json(NOT_FOUND, 404)
      if (method === 'GET') return json(found)
      if (method === 'PATCH') return json(Object.assign(found, body))
      if (method === 'DELETE') {
        const owned = state.properties.filter((p) => p.clientId === found.id).length
        if (owned > 0) return inUse('Client still has properties. Move or remove them first.', owned)
        state.clients = state.clients.filter((c) => c !== found)
        return new Response(null, { status: 204 })
      }
    }

    if (method === 'GET' && pathname === '/api/agencies') {
      return paged(state.agencies.filter(named).sort((a, b) => a.name.localeCompare(b.name)))
    }
    if (method === 'POST' && pathname === '/api/agencies') {
      const created = { id: `agency-${state.agencies.length + 1}`, name: (body as { name: string }).name }
      state.agencies.push(created)
      return json(created, 201)
    }
    const agency = /^\/api\/agencies\/([^/]+)$/.exec(pathname)
    if (agency) {
      const found = state.agencies.find((a) => a.id === agency[1])
      if (!found) return json(NOT_FOUND, 404)
      if (method === 'GET') return json(found)
      if (method === 'PATCH') return json(Object.assign(found, body))
      if (method === 'DELETE') {
        const managed = state.properties.filter((p) => p.agencyId === found.id).length
        if (managed > 0) return inUse('Agency still manages properties. Move or remove them first.', managed)
        state.agencies = state.agencies.filter((a) => a !== found)
        return new Response(null, { status: 204 })
      }
    }
    return undefined
  }

  function listProperties(query: URLSearchParams) {
    const page = Number(query.get('page') ?? 1)
    const pageSize = Number(query.get('pageSize') ?? 20)
    const search = query.get('search')?.toLowerCase()
    const matches = state.properties
      .filter((p) => !search || p.name.toLowerCase().includes(search))
      .filter((p) => !query.get('propertyType') || p.propertyType === query.get('propertyType'))
      .filter((p) => !query.get('usageType') || p.usageType === query.get('usageType'))
      .filter((p) => !query.get('clientId') || p.clientId === query.get('clientId'))
      .sort((a, b) => a.name.localeCompare(b.name))
    return { items: matches.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: matches.length }
  }

  /** A request body as the API would store it: the address gets its city's name back. */
  function stored(body: unknown): Partial<Property> {
    const { address, forSale, ...request } = body as PropertyRequestBody
    // The sale comes back as the API derives it: when it was agreed to and where it stands.
    const rest = {
      ...request,
      forSale: forSale ? { priceCents: forSale.priceCents ?? 0, consentedAt: '2026-11-05T12:00:00.000Z', status: 'pending', missing: ['photo'] } : null,
    }
    if (!address) return { ...rest, address: null } as Partial<Property>
    const city = CITIES.find((c) => c.ibgeCode === address.cityId)
    return {
      ...rest,
      address: {
        cityId: address.cityId,
        city: city?.name ?? '?',
        state: city?.state ?? '?',
        street: address.street,
        number: address.number ?? null,
        complement: address.complement ?? null,
        neighborhood: address.neighborhood ?? null,
        postalCode: address.postalCode ?? null,
        latitude: null,
        longitude: null,
      },
    } as Partial<Property>
  }

  /** Answers for lists and for paths with an id in them. */
  function dynamic(method: string, pathname: string, query: URLSearchParams, body: unknown): Response | undefined {
    if (method === 'POST' && pathname === '/api/properties') {
      const created = makePropertyRecord(stored(body))
      state.properties.push(created)
      return json(created, 201)
    }
    const patched = /^\/api\/properties\/([^/]+)$/.exec(pathname)
    if (method === 'PATCH' && patched) {
      const index = state.properties.findIndex((p) => p.id === patched[1])
      if (index < 0) return json(NOT_FOUND, 404)
      state.properties[index] = { ...state.properties[index]!, ...stored(body) }
      return json(state.properties[index])
    }
    if (method === 'DELETE' && patched) {
      const before = state.properties.length
      state.properties = state.properties.filter((p) => p.id !== patched[1])
      return state.properties.length < before ? new Response(null, { status: 204 }) : json(NOT_FOUND, 404)
    }
    if (method !== 'GET') return undefined
    if (pathname === '/api/properties') return json(listProperties(query))
    if (pathname === '/api/lookups/cities') {
      const search = (query.get('search') ?? '').toLowerCase()
      return json(CITIES.filter((city) => city.name.toLowerCase().startsWith(search)))
    }
    const property = /^\/api\/properties\/([^/]+)$/.exec(pathname)
    if (property) {
      const found = state.properties.find((p) => p.id === property[1])
      return found ? json(found) : json(NOT_FOUND, 404)
    }
    const schedule = /^\/api\/properties\/([^/]+)\/financing-schedule$/.exec(pathname)
    if (schedule) {
      const financing = state.properties.find((p) => p.id === schedule[1])?.financing
      if (!financing) return json(NOT_FOUND, 404)
      return json(
        makeFinancingSchedule({
          financedAmountCents: financing.financedAmountCents,
          termMonths: financing.termMonths,
          firstInstallmentOn: financing.firstInstallmentOn,
          monthlyRate: financing.annualInterestRate / 1200,
        }),
      )
    }
    const kpi = /^\/api\/kpis\/properties\/([^/]+)$/.exec(pathname)
    if (kpi) {
      const found = state.properties.find((p) => p.id === kpi[1])
      return found
        ? json(makeProperty({ propertyId: found.id, name: found.name, status: found.status, usageType: found.usageType }))
        : json(NOT_FOUND, 404)
    }
    return undefined
  }

  const defaults: Record<string, Handler> = {
    // Public: answers without a session.
    'GET /api/listings': () => json({ whatsappNumber: '5548991802046', items: listings }),
    'GET /api/me': () => (state.session ? json(state.session) : json(UNAUTHENTICATED, 401)),
    'GET /api/kpis/portfolio': () => (state.session ? json(state.kpis) : json(UNAUTHENTICATED, 401)),
    'GET /api/lookups/property-catalog': () => json(CATALOG),
    'GET /api/lookups/transaction-categories': () => json(TRANSACTION_CATEGORIES),
    'GET /api/contract-template': () => json(templateAnswer(state.template)),
    // Only owners and admins write the template, like the API.
    'PUT /api/contract-template': async (request) => {
      if (state.session?.memberRole === 'member') return json({ error: { code: 'FORBIDDEN', message: 'Only owners and admins can edit the contract template' } }, 403)
      const { header, clauses, footer } = (await request.clone().json()) as StoredTemplate
      if (clauses.replace(/<[^>]*>/g, '').trim() === '') {
        return json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: [{ path: 'clauses', message: 'The clauses have no text' }] } }, 400)
      }
      state.template = { header, clauses, footer, updatedAt: '2026-11-05T16:00:00.000Z' }
      return json(templateAnswer(state.template))
    },
    'DELETE /api/contract-template': () => {
      if (state.session?.memberRole === 'member') return json({ error: { code: 'FORBIDDEN', message: 'Only owners and admins can edit the contract template' } }, 403)
      state.template = null
      return json(templateAnswer(null))
    },
    // Every month empty; a test that cares about the figures gives its own handler.
    'GET /api/kpis/cash-flow': (request) => {
      const query = new URL(request.url).searchParams
      return json(makeCashFlow(query.get('from') ?? '2026-01', query.get('to') ?? '2026-12'))
    },
    'GET /api/auth/organization/get-full-organization': () => {
      if (!state.session) return json(null)
      const isDemo = state.session.user.isAnonymous
      return json({
        id: state.session.organizationId,
        name: isDemo ? 'Demonstração' : 'Portfólio de Ana',
        isDemo,
        demoExpiresAt: isDemo ? new Date(Date.now() + 23.5 * 3_600_000).toISOString() : null,
        members: [],
        invitations: [],
      })
    },
  }

  /** JSON bodies as objects; multipart uploads as their fields, with files as File. */
  async function readBody(request: Request): Promise<unknown> {
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      return Object.fromEntries((await request.clone().formData()).entries())
    }
    const text = await request.clone().text()
    return text ? JSON.parse(text) : undefined
  }

  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(new URL(String(input), location.origin), init)
    const { pathname, searchParams } = new URL(request.url)
    const body = await readBody(request)
    calls.push({ method: request.method, path: pathname, query: searchParams, body })

    const handler = handlers[`${request.method} ${pathname}`] ?? defaults[`${request.method} ${pathname}`]
    if (handler) return handler(request)
    const answer = state.session
      ? (files(request.method, pathname, body) ??
        contractRoutes(request.method, pathname, searchParams, body) ??
        reservationRoutes(request.method, pathname, searchParams, body) ??
        clientRoutes(request.method, pathname, searchParams, body) ??
        transactionRoutes(request.method, pathname, searchParams, body) ??
        dynamic(request.method, pathname, searchParams, body))
      : undefined
    if (answer) return answer
    return json({ error: { code: 'NOT_FOUND', message: `No fake for ${request.method} ${pathname}` } }, 404)
  })

  vi.stubGlobal('fetch', fetch)
  return {
    state,
    calls,
    /** Calls made to `path`, in order. */
    callsTo: (path: string) => calls.filter((call) => call.path === path),
  }
}
