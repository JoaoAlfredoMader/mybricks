import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'

/** The agency lists and menus, and the properties that show the agency's name, read what was just written. */
function useRefreshAfterWrite() {
  const queryClient = useQueryClient()
  return () => Promise.all(['agencies', 'properties'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
}

export function useCreateAgency() {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (name: string) => unwrap(api.POST('/api/agencies', { body: { name } })),
    onSuccess: refresh,
  })
}

export function useRenameAgency() {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      unwrap(api.PATCH('/api/agencies/{id}', { params: { path: { id } }, body: { name } })),
    onSuccess: refresh,
  })
}

export function useDeleteAgency() {
  const refresh = useRefreshAfterWrite()
  return useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE('/api/agencies/{id}', { params: { path: { id } } })),
    onSuccess: refresh,
  })
}
