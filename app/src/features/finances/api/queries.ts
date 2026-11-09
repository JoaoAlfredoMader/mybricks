import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/lib/api/client'
import { type FlowWindow, flowWindowRange, type PeriodKey, periodRange } from '../lib/period'

export type CashFlow = Schemas['CashFlow']
export type CashFlowMonth = CashFlow['months'][number]
export type Transaction = Schemas['Transaction']
export type TransactionType = Transaction['type']
export type TransactionCategory = Schemas['TransactionCategoryList'][number]
export type CreateTransactionRequest = Schemas['CreateTransactionRequest']
export type UpdateTransactionRequest = Schemas['UpdateTransactionRequest']

export const PAGE_SIZE = 20

export interface TransactionFilters {
  page: number
  type?: TransactionType | undefined
  categoryId?: number | undefined
  propertyId?: string | undefined
  /** 'true' for recurring only, 'false' for one-off only. */
  recurring?: 'true' | 'false' | undefined
  period?: PeriodKey | undefined
  /** The window of the cash-flow chart above the list; it lives in the same URL but does not filter the list. */
  flow?: FlowWindow | undefined
}

export function transactionsQueryOptions(
  { page, type, categoryId, propertyId, recurring, period }: TransactionFilters,
  pageSize = PAGE_SIZE,
) {
  const query = {
    page,
    pageSize,
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(propertyId ? { propertyId } : {}),
    ...(recurring ? { isRecurring: recurring } : {}),
    ...(period ? periodRange(period) : {}),
  }
  return queryOptions({
    queryKey: ['transactions', 'list', query],
    queryFn: () => unwrap(api.GET('/api/transactions', { params: { query } })),
    placeholderData: keepPreviousData,
  })
}

export function transactionQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['transactions', 'detail', id],
    queryFn: () => unwrap(api.GET('/api/transactions/{id}', { params: { path: { id } } })),
  })
}

/**
 * Revenue and expenses month by month, added up by the API (a recurring transaction is one record,
 * so the API is what spreads it over the months). One property as a whole, or the whole portfolio.
 */
export function cashFlowQueryOptions(window: FlowWindow, propertyId?: string) {
  const query = { ...flowWindowRange(window), ...(propertyId ? { propertyId } : {}) }
  return queryOptions({
    queryKey: ['kpis', 'cash-flow', query],
    queryFn: () => unwrap(api.GET('/api/kpis/cash-flow', { params: { query } })),
    placeholderData: keepPreviousData,
  })
}

/** Revenue and expense categories; they change with a deploy, not with use. */
export const transactionCategoriesQueryOptions = queryOptions({
  queryKey: ['lookups', 'transaction-categories'],
  queryFn: () => unwrap(api.GET('/api/lookups/transaction-categories')),
  staleTime: Infinity,
})
