import { z } from 'zod'
import { ApiError } from '@/lib/api/client'
import { formatDocument, formatPhone } from '@/lib/format'
import { issuer } from '@/lib/form-issues'
import type { Client, CreateClientRequest } from '../api/queries'
import { DOCUMENT_DIGITS, DOCUMENT_LABEL } from './labels'

/**
 * The client form keeps what is typed as text and converts it only on submit, like the other
 * forms: "123.456.789-09" is sent as "12345678909".
 */
export interface ClientFormValues {
  name: string
  personType: Client['personType']
  document: string
  email: string
  whatsapp: string
}

export const EMPTY_CLIENT_FORM: ClientFormValues = { name: '', personType: 'individual', document: '', email: '', whatsapp: '' }

export function fromClient(client: Client): ClientFormValues {
  return {
    name: client.name,
    personType: client.personType,
    document: client.document ? formatDocument(client.document) : '',
    email: client.email ?? '',
    whatsapp: client.whatsapp ? formatPhone(client.whatsapp) : '',
  }
}

const digits = (text: string) => text.replace(/\D/g, '')
const orNull = (text: string) => text.trim() || null
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const clientFormSchema = z.custom<ClientFormValues>().superRefine((values, context) => {
  const issue = issuer(context)
  if (values.name.trim().length < 2) issue('name', 'Informe o nome (pelo menos 2 letras).')

  // Only the length is checked here; the check digits are the API's to judge.
  if (values.document.trim() && digits(values.document).length !== DOCUMENT_DIGITS[values.personType]) {
    issue('document', `${DOCUMENT_LABEL[values.personType]} com ${DOCUMENT_DIGITS[values.personType]} dígitos.`)
  }
  if (values.email.trim() && !EMAIL.test(values.email.trim())) issue('email', 'E-mail no formato nome@exemplo.com.')
  const phone = digits(values.whatsapp)
  if (values.whatsapp.trim() && (phone.length < 10 || phone.length > 15)) {
    issue('whatsapp', 'WhatsApp com DDD, por exemplo (11) 98765-4321.')
  }
})

/** Every field goes, so a cleared document, e-mail or WhatsApp is removed (`null`). Only call with values the schema accepted. */
export function toClientRequest(values: ClientFormValues): CreateClientRequest {
  return {
    name: values.name.trim(),
    personType: values.personType,
    document: orNull(digits(values.document)),
    email: orNull(values.email),
    whatsapp: orNull(digits(values.whatsapp)),
  }
}

/** The API's request paths are the form's field names. */
export const CLIENT_FIELDS: Record<string, keyof ClientFormValues> = {
  name: 'name',
  personType: 'personType',
  document: 'document',
  email: 'email',
  whatsapp: 'whatsapp',
}

/** The API answers in English; what a person can act on is said here in Portuguese. */
const API_MESSAGES: Record<string, string> = {
  'Invalid CPF': 'CPF inválido.',
  'Invalid CNPJ': 'CNPJ inválido.',
  'Enter the phone number with area code': 'Informe o WhatsApp com DDD.',
  'Client not found': 'Este cliente não existe mais.',
}

export function apiMessageInPortuguese(message: string): string {
  return API_MESSAGES[message] ?? 'A API recusou este valor. Revise e tente de novo.'
}

/** "1 imóvel", "3 imóveis". */
function properties(count: number) {
  return `${count} ${count === 1 ? 'imóvel' : 'imóveis'}`
}

/** The number the API reports in a 409's `details`, if it did. */
function countIn(details: unknown): number | null {
  const count = typeof details === 'object' && details !== null ? (details as { properties?: unknown }).properties : null
  return typeof count === 'number' ? count : null
}

/** For errors that do not belong to one field. A client with properties cannot be deleted: the API says how many. */
export function clientErrorMessage(error: unknown, fallback = 'Não foi possível salvar agora. Verifique a conexão e tente de novo.'): string {
  if (error instanceof ApiError) {
    const count = error.status === 409 ? countIn(error.details) : null
    if (count) return `Este cliente ainda é dono de ${properties(count)}. Passe-os para outro cliente ou exclua-os antes.`
    if (error.status === 403) return 'Exclusões ficam bloqueadas enquanto você vê o sistema como outra pessoa.'
    if (API_MESSAGES[error.message]) return API_MESSAGES[error.message]!
  }
  return fallback
}
