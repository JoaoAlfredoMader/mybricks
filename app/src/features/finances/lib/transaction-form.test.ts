import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { makeTransaction } from '@/test/fake-api'
import {
  apiMessageInPortuguese,
  emptyTransaction,
  fromTransaction,
  toCreateRequest,
  toUpdateRequest,
  transactionErrorMessage,
  transactionFormSchema,
  type TransactionFormValues,
} from './transaction-form'

const valid: TransactionFormValues = { ...emptyTransaction('property-1'), categoryId: '8', amount: '1.000,00', occurredOn: '01/11/2026' }

/** The first message per field the schema reports; empty when the values are fine. */
function problems(values: TransactionFormValues) {
  const result = transactionFormSchema.safeParse(values)
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]))
}

const apiError = (status: number, message: string, details?: unknown) =>
  new ApiError(status, { code: 'BUSINESS_RULE_VIOLATION', message, details } as never)

describe('transaction form values', () => {
  it('starts as an expense with nothing chosen, from the property it was opened on', () => {
    expect(emptyTransaction('p1')).toEqual({
      propertyId: 'p1',
      type: 'expense',
      categoryId: '',
      amount: '',
      occurredOn: '',
      description: '',
      isRecurring: false,
      recurrenceEndsOn: '',
    })
    expect(emptyTransaction().propertyId).toBe('')
  })

  it('writes a stored transaction the way people type it', () => {
    const values = fromTransaction(makeTransaction({ propertyId: 'p1', description: null, isRecurring: true, recurrenceEndsOn: '2027-01-23', amountCents: 385_000 }))
    expect(values).toMatchObject({
      propertyId: 'p1',
      type: 'expense',
      categoryId: '7',
      amount: '3.850,00',
      occurredOn: '23/10/2026',
      description: '',
      isRecurring: true,
      recurrenceEndsOn: '23/01/2027',
    })
    expect(fromTransaction(makeTransaction()).recurrenceEndsOn).toBe('')
  })
})

describe('transaction form checks', () => {
  it('accepts a complete one-off transaction', () => {
    expect(problems(valid)).toEqual({})
  })

  it('asks for what is missing', () => {
    expect(problems(emptyTransaction())).toEqual({
      propertyId: 'Escolha o imóvel.',
      categoryId: 'Escolha a categoria.',
      amount: 'Informe o valor.',
      occurredOn: 'Informe a data.',
    })
  })

  it('refuses an amount that is not money or not above zero', () => {
    const message = 'Valor em reais, maior que zero, por exemplo 1.850,00.'
    expect(problems({ ...valid, amount: 'mil reais' }).amount).toBe(message)
    expect(problems({ ...valid, amount: '0' }).amount).toBe(message)
    expect(problems({ ...valid, amount: '-5,00' }).amount).toBe(message)
    expect(problems({ ...valid, amount: '12,345' }).amount).toBe(message)
  })

  it('refuses a date that does not exist, and a description that is too long', () => {
    expect(problems({ ...valid, occurredOn: '31/02/2026' }).occurredOn).toBe('Data no formato dd/mm/aaaa.')
    expect(problems({ ...valid, occurredOn: '2026-11-01' }).occurredOn).toBe('Data no formato dd/mm/aaaa.')
    expect(problems({ ...valid, description: 'x'.repeat(501) }).description).toBe('Até 500 caracteres.')
    expect(problems({ ...valid, description: 'x'.repeat(500) })).toEqual({})
  })

  it('checks the end of a recurrence only when it recurs, and not before its start', () => {
    const recurring = { ...valid, isRecurring: true }
    expect(problems(recurring)).toEqual({})
    expect(problems({ ...recurring, recurrenceEndsOn: '30/10/2026' }).recurrenceEndsOn).toBe('O fim não pode ser antes da primeira ocorrência.')
    expect(problems({ ...recurring, recurrenceEndsOn: '01/11/2026' })).toEqual({})
    expect(problems({ ...recurring, recurrenceEndsOn: 'em breve' }).recurrenceEndsOn).toBe('Data no formato dd/mm/aaaa.')
    // A one-off transaction has no end: whatever is typed there does not count.
    expect(problems({ ...valid, recurrenceEndsOn: 'em breve' })).toEqual({})
  })
})

describe('transaction requests', () => {
  it('converts what was typed, and sends no end for a one-off transaction', () => {
    expect(toUpdateRequest({ ...valid, description: '  Pintura  ', recurrenceEndsOn: '01/01/2030' })).toEqual({
      categoryId: 8,
      amountCents: 100_000,
      occurredOn: '2026-11-01',
      description: 'Pintura',
      isRecurring: false,
      recurrenceEndsOn: null,
    })
  })

  it('sends the end of a recurrence, or null while it runs', () => {
    expect(toUpdateRequest({ ...valid, isRecurring: true, recurrenceEndsOn: '01/01/2027' })).toMatchObject({ isRecurring: true, recurrenceEndsOn: '2027-01-01' })
    expect(toUpdateRequest({ ...valid, isRecurring: true })).toMatchObject({ isRecurring: true, recurrenceEndsOn: null, description: null })
  })

  it('adds the property when creating', () => {
    expect(toCreateRequest(valid)).toEqual({ propertyId: 'property-1', ...toUpdateRequest(valid) })
  })
})

describe('transaction error messages', () => {
  it('says the API refusals in Portuguese, and falls back for the unknown', () => {
    expect(apiMessageInPortuguese('Category not found')).toBe('Esta categoria não existe mais.')
    expect(apiMessageInPortuguese('Only recurring transactions have an end date')).toBe('Só lançamentos recorrentes têm data para acabar.')
    expect(apiMessageInPortuguese('Something new')).toBe('A API recusou este valor. Revise e tente de novo.')
  })

  it('explains a delete the API blocked while impersonating, a known refusal, and anything else', () => {
    expect(transactionErrorMessage(apiError(403, 'Forbidden'))).toBe('Exclusões ficam bloqueadas enquanto você vê o sistema como outra pessoa.')
    expect(transactionErrorMessage(apiError(404, 'Transaction not found'))).toBe('Este lançamento não existe mais.')
    expect(transactionErrorMessage(apiError(500, 'boom'))).toContain('Não foi possível salvar agora')
    expect(transactionErrorMessage(new Error('offline'))).toContain('Verifique a conexão')
    expect(transactionErrorMessage(new Error('offline'), 'Outro texto')).toBe('Outro texto')
  })
})
