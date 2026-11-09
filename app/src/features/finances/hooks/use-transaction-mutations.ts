import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api, unwrap } from '@/lib/api/client'
import {
  type CreateTransactionRequest,
  type Transaction,
  transactionQueryOptions,
  type UpdateTransactionRequest,
} from '../api/queries'

/** The lists read what was just written, and so do the indicators: a property's IRR counts its transactions. */
function useRefreshAfterWrite() {
  const queryClient = useQueryClient()
  return async (transaction?: Transaction) => {
    if (transaction) queryClient.setQueryData(transactionQueryOptions(transaction.id).queryKey, transaction)
    await Promise.all(['transactions', 'kpis'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
  }
}

export function useCreateTransaction() {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (body: CreateTransactionRequest) => unwrap(api.POST('/api/transactions', { body })),
    onSuccess: refresh,
  })
}

export function useUpdateTransaction(id: string) {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (body: UpdateTransactionRequest) =>
      unwrap(api.PATCH('/api/transactions/{id}', { params: { path: { id } }, body })),
    onSuccess: refresh,
  })
}

/** Deletes the transaction and leaves its page first, so nothing tries to show it again. */
export function useDeleteTransaction(id: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/transactions/{id}', { params: { path: { id } } })),
    onSuccess: async () => {
      await navigate({ to: '/app/financas' })
      queryClient.removeQueries({ queryKey: transactionQueryOptions(id).queryKey })
      await refresh()
    },
  })
}
