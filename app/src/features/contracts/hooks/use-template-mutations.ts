import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { contractTemplateQueryOptions, type SaveTemplateRequest } from '../api/template'

export function useSaveTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveTemplateRequest) => unwrap(api.PUT('/api/contract-template', { body })),
    onSuccess: (template) => queryClient.setQueryData(contractTemplateQueryOptions.queryKey, template),
  })
}

/** Back to the default contract. */
export function useResetTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/contract-template')),
    onSuccess: (template) => queryClient.setQueryData(contractTemplateQueryOptions.queryKey, template),
  })
}
