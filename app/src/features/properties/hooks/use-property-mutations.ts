import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api, unwrap } from '@/lib/api/client'
import { propertyQueryOptions } from '../api/queries'
import type { PropertyRequest } from '../lib/property-form'

/** Lists, the dashboard, the indicators, the contracts and the reservations (which name the property) read what was just written. */
function useRefreshAfterWrite() {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all(
      ['properties', 'kpis', 'contracts', 'reservations'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    )
  }
}

export function useCreateProperty() {
  const queryClient = useQueryClient()
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (body: PropertyRequest) => unwrap(api.POST('/api/properties', { body })),
    onSuccess: async (property) => {
      queryClient.setQueryData(propertyQueryOptions(property.id).queryKey, property)
      await refresh()
    },
  })
}

/** Deletes the property and leaves its page first, so nothing tries to show it again. */
export function useDeleteProperty(id: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/properties/{id}', { params: { path: { id } } })),
    onSuccess: async () => {
      await navigate({ to: '/app/imoveis' })
      queryClient.removeQueries({ queryKey: propertyQueryOptions(id).queryKey })
      for (const part of ['photos', 'documents', 'financing-schedule']) queryClient.removeQueries({ queryKey: ['properties', part, id] })
      await refresh()
    },
  })
}

export function useUpdateProperty(id: string) {
  const queryClient = useQueryClient()
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (body: PropertyRequest) => unwrap(api.PATCH('/api/properties/{id}', { params: { path: { id } }, body })),
    onSuccess: async (property) => {
      queryClient.setQueryData(propertyQueryOptions(id).queryKey, property)
      await refresh()
    },
  })
}
