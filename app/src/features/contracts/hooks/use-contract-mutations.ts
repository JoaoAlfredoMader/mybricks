import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { type Contract, contractQueryOptions, type CreateContractRequest, type UpdateContractRequest } from '../api/queries'

/**
 * A contract decides who rents a property and for how much, so after any change the
 * contracts, the properties (their status) and every indicator are read again.
 */
function useRefreshAfterWrite() {
  const queryClient = useQueryClient()
  return async (contract?: Contract) => {
    if (contract) queryClient.setQueryData(contractQueryOptions(contract.id).queryKey, contract)
    await Promise.all(
      ['contracts', 'properties', 'kpis', 'occupants'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    )
  }
}

export function useCreateContract() {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (body: CreateContractRequest) => unwrap(api.POST('/api/contracts', { body })),
    onSuccess: async (contract) => {
      const { replacedContractId: _, ...stored } = contract
      await refresh(stored)
    },
  })
}

export function useUpdateContract(id: string) {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (body: UpdateContractRequest) =>
      unwrap(api.PATCH('/api/contracts/{id}', { params: { path: { id } }, body })),
    onSuccess: (contract) => refresh(contract),
  })
}

/** Ends the contract on `endDate` (YYYY-MM-DD). */
export function useEndContract(id: string) {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (endDate: string) =>
      unwrap(api.POST('/api/contracts/{id}/end', { params: { path: { id } }, body: { endDate } })),
    onSuccess: (contract) => refresh(contract),
  })
}

export function useCancelContract(id: string) {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: () => unwrap(api.POST('/api/contracts/{id}/cancel', { params: { path: { id } } })),
    onSuccess: (contract) => refresh(contract),
  })
}

/** Fills the organization's template and stores the PDF; generating again replaces it. */
export function useGenerateContractPdf(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap(api.POST('/api/contracts/{id}/pdf', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractQueryOptions(id).queryKey }),
  })
}
