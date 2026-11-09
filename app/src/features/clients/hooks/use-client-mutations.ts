import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { api, unwrap } from '@/lib/api/client'
import { type Client, clientQueryOptions, type CreateClientRequest, type UpdateClientRequest } from '../api/queries'

/** The client lists and menus, and the properties that show the owner's name, read what was just written. */
function useRefreshAfterWrite() {
  const queryClient = useQueryClient()
  return async (client?: Client) => {
    if (client) queryClient.setQueryData(clientQueryOptions(client.id).queryKey, client)
    await Promise.all(['clients', 'properties'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
  }
}

export function useCreateClient() {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (body: CreateClientRequest) => unwrap(api.POST('/api/clients', { body })),
    onSuccess: refresh,
  })
}

export function useUpdateClient(id: string) {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (body: UpdateClientRequest) => unwrap(api.PATCH('/api/clients/{id}', { params: { path: { id } }, body })),
    onSuccess: refresh,
  })
}

/** Deletes the client and leaves its page first, so nothing tries to show it again. */
export function useDeleteClient(id: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: () => unwrap(api.DELETE('/api/clients/{id}', { params: { path: { id } } })),
    onSuccess: async () => {
      await navigate({ to: '/app/clientes' })
      queryClient.removeQueries({ queryKey: clientQueryOptions(id).queryKey })
      queryClient.removeQueries({ queryKey: ['properties', 'by-client', id] })
      await refresh()
    },
  })
}
