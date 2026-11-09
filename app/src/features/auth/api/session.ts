import { queryOptions } from '@tanstack/react-query'
import { ApiError, api, type Schemas, unwrap } from '@/lib/api/client'

export type Session = Schemas['Session']

/** Who is signed in, from GET /api/me; `null` when nobody is. */
export const sessionQueryOptions = queryOptions({
  queryKey: ['session'],
  queryFn: async (): Promise<Session | null> => {
    try {
      return await unwrap(api.GET('/api/me'))
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
  staleTime: 5 * 60_000,
  // A 401 is an answer, not a failure; only an unreachable API is worth one more try.
  retry: 1,
})
