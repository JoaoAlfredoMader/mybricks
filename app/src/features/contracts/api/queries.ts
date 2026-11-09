import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/lib/api/client'

export type Contract = Schemas['Contract']
export type ContractStatus = Contract['status']
export type ContractType = Contract['contractType']
export type AdjustmentIndex = NonNullable<NonNullable<Contract['rentTerms']>['adjustmentIndex']>
export type CreateContractRequest = Schemas['CreateContractRequest']
export type UpdateContractRequest = Schemas['UpdateContractRequest']

export const PAGE_SIZE = 20

export interface ContractFilters {
  page: number
  status?: ContractStatus | undefined
  contractType?: ContractType | undefined
  propertyId?: string | undefined
}

export function contractsQueryOptions({ page, status, contractType, propertyId }: ContractFilters, pageSize = PAGE_SIZE) {
  const query = {
    page,
    pageSize,
    ...(status ? { status } : {}),
    ...(contractType ? { contractType } : {}),
    ...(propertyId ? { propertyId } : {}),
  }
  return queryOptions({
    queryKey: ['contracts', 'list', query],
    queryFn: () => unwrap(api.GET('/api/contracts', { params: { query } })),
    placeholderData: keepPreviousData,
  })
}

export function contractQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['contracts', 'detail', id],
    queryFn: () => unwrap(api.GET('/api/contracts/{id}', { params: { path: { id } } })),
  })
}

/** The active contract of a property, if it has one (a property has at most one). */
export function activeContractQueryOptions(propertyId: string) {
  return queryOptions({
    queryKey: ['contracts', 'active', propertyId],
    queryFn: async () => {
      const page = await unwrap(
        api.GET('/api/contracts', { params: { query: { propertyId, status: 'active', pageSize: 1 } } }),
      )
      return page.items[0] ?? null
    },
    enabled: propertyId !== '',
  })
}
