import { z } from 'zod'
import { ApiError } from '@/lib/api/client'
import { issuer } from '@/lib/form-issues'
import { dateToInput, moneyToInput, parseDate, parseMoney } from '@/lib/parse'
import type { CreateTransactionRequest, Transaction, TransactionType, UpdateTransactionRequest } from '../api/queries'

/**
 * The transaction form keeps what is typed as text and converts it only on submit, like the
 * other forms. The type is not sent: the API takes it from the category, so here it only narrows
 * the category menu.
 */
export interface TransactionFormValues {
  propertyId: string
  type: TransactionType
  /** The category id as text, '' for none chosen. */
  categoryId: string
  amount: string
  occurredOn: string
  description: string
  isRecurring: boolean
  recurrenceEndsOn: string
}

export function emptyTransaction(propertyId = ''): TransactionFormValues {
  return {
    propertyId,
    type: 'expense',
    categoryId: '',
    amount: '',
    occurredOn: '',
    description: '',
    isRecurring: false,
    recurrenceEndsOn: '',
  }
}

export function fromTransaction(transaction: Transaction): TransactionFormValues {
  return {
    propertyId: transaction.propertyId,
    type: transaction.type,
    categoryId: String(transaction.categoryId),
    amount: moneyToInput(transaction.amountCents),
    occurredOn: dateToInput(transaction.occurredOn),
    description: transaction.description ?? '',
    isRecurring: transaction.isRecurring,
    recurrenceEndsOn: dateToInput(transaction.recurrenceEndsOn),
  }
}

export const MAX_DESCRIPTION = 500

export const transactionFormSchema = z.custom<TransactionFormValues>().superRefine((values, context) => {
  const issue = issuer(context)
  if (!values.propertyId) issue('propertyId', 'Escolha o imóvel.')
  if (!values.categoryId) issue('categoryId', 'Escolha a categoria.')

  const amount = parseMoney(values.amount)
  if (amount === null) issue('amount', 'Informe o valor.')
  else if (amount === undefined || amount <= 0) issue('amount', 'Valor em reais, maior que zero, por exemplo 1.850,00.')

  const first = parseDate(values.occurredOn)
  if (first === null) issue('occurredOn', 'Informe a data.')
  else if (first === undefined) issue('occurredOn', 'Data no formato dd/mm/aaaa.')

  if (values.description.trim().length > MAX_DESCRIPTION) issue('description', `Até ${MAX_DESCRIPTION} caracteres.`)

  if (values.isRecurring) {
    const end = parseDate(values.recurrenceEndsOn)
    if (end === undefined) issue('recurrenceEndsOn', 'Data no formato dd/mm/aaaa.')
    else if (end && first && end < first) issue('recurrenceEndsOn', 'O fim não pode ser antes da primeira ocorrência.')
  }
})

const orNull = (text: string) => text.trim() || null

/** Everything but the property, which is fixed once recorded. Only call with values the schema accepted. */
export function toUpdateRequest(values: TransactionFormValues): Required<UpdateTransactionRequest> {
  return {
    categoryId: Number(values.categoryId),
    amountCents: parseMoney(values.amount)!,
    occurredOn: parseDate(values.occurredOn)!,
    description: orNull(values.description),
    isRecurring: values.isRecurring,
    // A one-off transaction has no end date; sending one would be refused.
    recurrenceEndsOn: values.isRecurring ? (parseDate(values.recurrenceEndsOn) ?? null) : null,
  }
}

export function toCreateRequest(values: TransactionFormValues): CreateTransactionRequest {
  return { propertyId: values.propertyId, ...toUpdateRequest(values) }
}

/** Where a validation error from the API lands in the form. */
export const REQUEST_PATH_TO_FIELD: Record<string, keyof TransactionFormValues> = {
  propertyId: 'propertyId',
  categoryId: 'categoryId',
  amountCents: 'amount',
  occurredOn: 'occurredOn',
  description: 'description',
  isRecurring: 'isRecurring',
  recurrenceEndsOn: 'recurrenceEndsOn',
}

/** The API answers in English; what a person can act on is said here in Portuguese. */
const API_MESSAGES: Record<string, string> = {
  'Category not found': 'Esta categoria não existe mais.',
  'Only recurring transactions have an end date': 'Só lançamentos recorrentes têm data para acabar.',
  'The end date cannot be before the first occurrence': 'O fim não pode ser antes da primeira ocorrência.',
  'Property not found': 'Este imóvel não existe mais.',
  'Transaction not found': 'Este lançamento não existe mais.',
}

export function apiMessageInPortuguese(message: string): string {
  return API_MESSAGES[message] ?? 'A API recusou este valor. Revise e tente de novo.'
}

/** For errors that do not belong to one field. */
export function transactionErrorMessage(
  error: unknown,
  fallback = 'Não foi possível salvar agora. Verifique a conexão e tente de novo.',
): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Exclusões ficam bloqueadas enquanto você vê o sistema como outra pessoa.'
    if (API_MESSAGES[error.message]) return API_MESSAGES[error.message]!
  }
  return fallback
}
