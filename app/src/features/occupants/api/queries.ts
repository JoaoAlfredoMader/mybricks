import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/lib/api/client'

/** A tenant or a guest: the same person record serves contracts and reservations. */
export type Occupant = Schemas['Occupant']

/** Occupants already on file whose name, document or e-mail matches `search`. */
export function occupantsQueryOptions(search: string) {
  return queryOptions({
    queryKey: ['occupants', search],
    queryFn: () =>
      unwrap(api.GET('/api/occupants', { params: { query: { pageSize: 8, ...(search ? { search } : {}) } } })),
    placeholderData: keepPreviousData,
  })
}
