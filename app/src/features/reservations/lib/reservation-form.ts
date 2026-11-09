import { z } from 'zod'
import { ApiError } from '@/lib/api/client'
import { formatNumericDate } from '@/lib/format'
import { type Issue, issuer } from '@/lib/form-issues'
import { dateToInput, moneyToInput, parseDate, parseMoney } from '@/lib/parse'
import {
  checkOccupant,
  EMPTY_OCCUPANT,
  OCCUPANT_API_MESSAGES,
  OCCUPANT_PATH_TO_FIELD,
  type OccupantValues,
  toOccupantRequest,
} from '@/features/occupants/lib/occupant-form'
import type { CreateReservationRequest, Reservation, UpdateReservationRequest } from '../api/queries'

/**
 * The reservation forms keep what is typed as text and convert it only on submit, like the
 * other forms: "1.850,00" becomes 185000 cents, "10/12/2026" becomes "2026-12-10".
 */

export interface StayValues {
  checkIn: string
  checkOut: string
  totalAmount: string
  /** The id of a short-stay contract, or '' for none. */
  contractId: string
  notes: string
}

export interface NewReservationValues extends StayValues, OccupantValues {
  propertyId: string
}

export type EditReservationValues = StayValues

const EMPTY_STAY: StayValues = { checkIn: '', checkOut: '', totalAmount: '', contractId: '', notes: '' }

export function emptyNewReservation(propertyId = ''): NewReservationValues {
  return { propertyId, ...EMPTY_STAY, ...EMPTY_OCCUPANT }
}

export function fromReservation(reservation: Reservation): EditReservationValues {
  return {
    checkIn: dateToInput(reservation.checkIn),
    checkOut: dateToInput(reservation.checkOut),
    totalAmount: moneyToInput(reservation.totalAmountCents),
    contractId: reservation.contractId ?? '',
    notes: reservation.notes ?? '',
  }
}

function checkStay(values: StayValues, issue: Issue) {
  const checkIn = parseDate(values.checkIn)
  if (checkIn === null) issue('checkIn', 'Informe a entrada.')
  else if (checkIn === undefined) issue('checkIn', 'Data no formato dd/mm/aaaa.')

  const checkOut = parseDate(values.checkOut)
  if (checkOut === null) issue('checkOut', 'Informe a saída.')
  else if (checkOut === undefined) issue('checkOut', 'Data no formato dd/mm/aaaa.')
  else if (checkIn && checkOut <= checkIn) issue('checkOut', 'A saída precisa ser depois da entrada.')

  const total = parseMoney(values.totalAmount)
  if (total === undefined || (total !== null && total < 0)) issue('totalAmount', 'Valor em reais, por exemplo 1.850,00.')
}

export const newReservationSchema = z.custom<NewReservationValues>().superRefine((values, context) => {
  const issue = issuer(context)
  if (!values.propertyId) issue('propertyId', 'Escolha o imóvel.')
  checkOccupant(values, issue)
  checkStay(values, issue)
})

export const editReservationSchema = z.custom<EditReservationValues>().superRefine((values, context) => {
  checkStay(values, issuer(context))
})

const orNull = (text: string) => text.trim() || null

/** Only call with values the schema accepted. A blank total is 0, as in the API. */
export function toCreateRequest(values: NewReservationValues): CreateReservationRequest {
  return {
    propertyId: values.propertyId,
    checkIn: parseDate(values.checkIn)!,
    checkOut: parseDate(values.checkOut)!,
    totalAmountCents: parseMoney(values.totalAmount) ?? 0,
    contractId: values.contractId || null,
    notes: orNull(values.notes),
    ...toOccupantRequest(values),
  }
}

/**
 * The total and the notes always go; the dates and the contract only when they changed, because
 * the API checks them again (overlaps, the contract's term and status) whenever they are sent.
 */
export function toUpdateRequest(values: EditReservationValues, initial: EditReservationValues): UpdateReservationRequest {
  return {
    totalAmountCents: parseMoney(values.totalAmount) ?? 0,
    notes: orNull(values.notes),
    ...(values.checkIn !== initial.checkIn ? { checkIn: parseDate(values.checkIn)! } : {}),
    ...(values.checkOut !== initial.checkOut ? { checkOut: parseDate(values.checkOut)! } : {}),
    ...(values.contractId !== initial.contractId ? { contractId: values.contractId || null } : {}),
  }
}

/** Where a validation error from the API lands in the forms. */
export const REQUEST_PATH_TO_FIELD: Record<string, keyof NewReservationValues> = {
  ...OCCUPANT_PATH_TO_FIELD,
  propertyId: 'propertyId',
  checkIn: 'checkIn',
  checkOut: 'checkOut',
  totalAmountCents: 'totalAmount',
  contractId: 'contractId',
  notes: 'notes',
}

/** The same paths, limited to what a confirmed reservation lets people edit. */
export const EDIT_REQUEST_PATH_TO_FIELD: Record<string, keyof EditReservationValues> = {
  checkIn: 'checkIn',
  checkOut: 'checkOut',
  totalAmountCents: 'totalAmount',
  contractId: 'contractId',
  notes: 'notes',
}

/** The API answers in English; what a person can act on is said here in Portuguese. */
const API_MESSAGES: Record<string, string> = {
  ...OCCUPANT_API_MESSAGES,
  'Check-out must be after check-in': 'A saída precisa ser depois da entrada.',
  'Contract not found': 'Este contrato não existe mais.',
  'The contract belongs to another property': 'Este contrato é de outro imóvel.',
  'Only short-stay contracts can be linked to a reservation': 'Só contratos de temporada podem ser ligados a uma reserva.',
  'The contract is not active': 'Este contrato não está mais ativo.',
  'The stay falls outside the contract period': 'A estadia fica fora da vigência do contrato.',
  'Property not found': 'Este imóvel não existe mais.',
  'Reservations are only for properties with short-stay usage': 'Só imóveis de temporada têm reservas.',
  'Only confirmed reservations can be changed': 'Só reservas confirmadas podem ser alteradas.',
  'Only confirmed reservations can be cancelled': 'Só reservas confirmadas podem ser canceladas.',
}

export function apiMessageInPortuguese(message: string): string {
  return API_MESSAGES[message] ?? 'A API recusou este valor. Revise e tente de novo.'
}

/** Two stays cannot share a night: the API names the dates of the one in the way. */
function clashingStay(details: unknown): { checkIn: string; checkOut: string } | null {
  if (typeof details !== 'object' || details === null) return null
  const { checkIn, checkOut } = details as { checkIn?: unknown; checkOut?: unknown }
  return typeof checkIn === 'string' && typeof checkOut === 'string' ? { checkIn, checkOut } : null
}

/** For errors that do not belong to one field. */
export function reservationErrorMessage(
  error: unknown,
  fallback = 'Não foi possível salvar agora. Verifique a conexão e tente de novo.',
): string {
  if (error instanceof ApiError) {
    const clash = error.status === 409 ? clashingStay(error.details) : null
    if (clash) {
      return `Este imóvel já tem uma reserva confirmada de ${formatNumericDate(clash.checkIn)} a ${formatNumericDate(clash.checkOut)}. A saída de uma reserva pode ser no mesmo dia da entrada da seguinte.`
    }
    if (API_MESSAGES[error.message]) return API_MESSAGES[error.message]!
  }
  return fallback
}
