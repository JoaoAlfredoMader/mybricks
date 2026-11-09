// Enumerated values, shared by the schema, the validation schemas and the DTOs.

export const InvitationStatus = {
  pending: 'pending',
  accepted: 'accepted',
  rejected: 'rejected',
  canceled: 'canceled'
} as const

export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus]


export const PersonType = {
  individual: 'individual',
  company: 'company'
} as const

export type PersonType = (typeof PersonType)[keyof typeof PersonType]


export const PropertyType = {
  residential: 'residential',
  commercial: 'commercial',
  land: 'land',
  logistics: 'logistics',
  rural: 'rural',
  parking: 'parking'
} as const

export type PropertyType = (typeof PropertyType)[keyof typeof PropertyType]


export const UsageType = {
  rental: 'rental',
  short_stay: 'short_stay',
  agricultural_lease: 'agricultural_lease',
  concession: 'concession',
  own_use: 'own_use',
  loan_for_use: 'loan_for_use'
} as const

export type UsageType = (typeof UsageType)[keyof typeof UsageType]


export const ConservationState = {
  degraded: 'degraded',
  poor: 'poor',
  regular: 'regular',
  good: 'good',
  excellent: 'excellent'
} as const

export type ConservationState = (typeof ConservationState)[keyof typeof ConservationState]


export const RentalMode = {
  manual: 'manual',
  contract: 'contract'
} as const

export type RentalMode = (typeof RentalMode)[keyof typeof RentalMode]


export const AcquisitionType = {
  purchase: 'purchase',
  construction: 'construction',
  inheritance: 'inheritance',
  other: 'other'
} as const

export type AcquisitionType = (typeof AcquisitionType)[keyof typeof AcquisitionType]


export const AmortizationSystem = {
  sac: 'sac',
  price: 'price'
} as const

export type AmortizationSystem = (typeof AmortizationSystem)[keyof typeof AmortizationSystem]


export const RegistrationStatus = {
  regular: 'regular',
  irregular: 'irregular'
} as const

export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus]


export const ProposalType = {
  purchase: 'purchase',
  sale: 'sale',
  rental: 'rental',
  linked: 'linked',
  informal: 'informal'
} as const

export type ProposalType = (typeof ProposalType)[keyof typeof ProposalType]


export const ContractType = {
  conventional: 'conventional',
  short_stay: 'short_stay'
} as const

export type ContractType = (typeof ContractType)[keyof typeof ContractType]


export const ContractStatus = {
  active: 'active',
  ended: 'ended',
  cancelled: 'cancelled'
} as const

export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus]


export const AdjustmentIndex = {
  igpm: 'igpm',
  ipca: 'ipca',
  inpc: 'inpc',
  igpdi: 'igpdi',
  other: 'other'
} as const

export type AdjustmentIndex = (typeof AdjustmentIndex)[keyof typeof AdjustmentIndex]


export const ReservationStatus = {
  confirmed: 'confirmed',
  cancelled: 'cancelled'
} as const

export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus]


export const TransactionType = {
  revenue: 'revenue',
  expense: 'expense'
} as const

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]


export const FeedbackStatus = {
  open: 'open',
  resolved: 'resolved'
} as const

export type FeedbackStatus = (typeof FeedbackStatus)[keyof typeof FeedbackStatus]


export const AuditAction = {
  login: 'login',
  logout: 'logout',
  create: 'create',
  update: 'update',
  delete: 'delete',
  view: 'view',
  upload: 'upload',
  end_contract: 'end_contract',
  cancel: 'cancel',
  generate_pdf: 'generate_pdf',
  generate_report: 'generate_report',
  invite_member: 'invite_member',
  remove_member: 'remove_member',
  impersonate_start: 'impersonate_start',
  impersonate_end: 'impersonate_end',
  unauthorized_access: 'unauthorized_access'
} as const

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]


export const AuditEntityType = {
  property: 'property',
  client: 'client',
  transaction: 'transaction',
  document: 'document',
  photo: 'photo',
  contract: 'contract',
  reservation: 'reservation',
  occupant: 'occupant',
  member: 'member',
  organization: 'organization',
  report: 'report',
  feedback: 'feedback'
} as const

export type AuditEntityType = (typeof AuditEntityType)[keyof typeof AuditEntityType]
