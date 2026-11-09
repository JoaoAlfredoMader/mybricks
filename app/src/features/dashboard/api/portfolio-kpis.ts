import { queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/lib/api/client'

export type PortfolioKpis = Schemas['PortfolioKpis']
export type PropertyKpis = Schemas['PropertyKpis']
export type PropertyStatus = PropertyKpis['status']
export type UsageType = PropertyKpis['usageType']

/** Indicators of the whole portfolio as of today, calculated by the API on every request. */
export const portfolioKpisQueryOptions = queryOptions({
  queryKey: ['kpis', 'portfolio'],
  queryFn: () => unwrap(api.GET('/api/kpis/portfolio')),
})
