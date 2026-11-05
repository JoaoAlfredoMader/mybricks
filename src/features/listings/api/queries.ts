import { queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/lib/api/client'

export type Listings = Schemas['Listings']
export type Listing = Schemas['Listing']

/** How many cards the carousel asks for. */
export const LISTINGS_LIMIT = 12

/** The public listings and the platform's WhatsApp: no session needed, so the landing can show them. */
export const listingsQueryOptions = queryOptions({
  queryKey: ['listings', LISTINGS_LIMIT],
  queryFn: () => unwrap(api.GET('/api/listings', { params: { query: { limit: LISTINGS_LIMIT } } })),
  staleTime: 60_000,
  // Not essential: one more try, then the section simply does not appear.
  retry: 1,
})
