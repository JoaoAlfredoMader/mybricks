import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/lib/api/client'

export type Client = Schemas['Client']
export type PersonType = Client['personType']
export type Agency = Schemas['Agency']
export type CreateClientRequest = Schemas['CreateClientRequest']
export type UpdateClientRequest = Schemas['UpdateClientRequest']

export const PAGE_SIZE = 20

export interface ClientFilters {
  page: number
  search?: string | undefined
  personType?: PersonType | undefined
}

export function clientsQueryOptions({ page, search, personType }: ClientFilters) {
  const query = {
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(personType ? { personType } : {}),
  }
  return queryOptions({
    queryKey: ['clients', 'list', query],
    queryFn: () => unwrap(api.GET('/api/clients', { params: { query } })),
    placeholderData: keepPreviousData,
  })
}

export function clientQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['clients', 'detail', id],
    queryFn: () => unwrap(api.GET('/api/clients/{id}', { params: { path: { id } } })),
  })
}

/** The properties a client owns (the first page), for the client's own page. */
export function clientPropertiesQueryOptions(clientId: string) {
  return queryOptions({
    queryKey: ['properties', 'by-client', clientId],
    queryFn: () => unwrap(api.GET('/api/properties', { params: { query: { clientId, pageSize: PAGE_SIZE } } })),
  })
}

export function agenciesQueryOptions(page: number) {
  return queryOptions({
    queryKey: ['agencies', 'list', page],
    queryFn: () => unwrap(api.GET('/api/agencies', { params: { query: { page, pageSize: PAGE_SIZE } } })),
    placeholderData: keepPreviousData,
  })
}

/** Clients and agencies to pick from in the property form (the first hundred, by name). */
export const clientOptionsQueryOptions = queryOptions({
  queryKey: ['clients', 'options'],
  queryFn: () => unwrap(api.GET('/api/clients', { params: { query: { pageSize: 100 } } })),
})

export const agencyOptionsQueryOptions = queryOptions({
  queryKey: ['agencies', 'options'],
  queryFn: () => unwrap(api.GET('/api/agencies', { params: { query: { pageSize: 100 } } })),
})
