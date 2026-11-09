import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/lib/api/client'
import type { PropertyType, UsageType } from '../lib/labels'

export type Property = Schemas['Property']
export type PropertyKpis = Schemas['PropertyKpis']
export type PropertyCatalog = Schemas['PropertyCatalog']

export const PAGE_SIZE = 20

export interface PropertyFilters {
  page: number
  search?: string | undefined
  propertyType?: PropertyType | undefined
  usageType?: UsageType | undefined
}

export function propertiesQueryOptions({ page, search, propertyType, usageType }: PropertyFilters) {
  const query = {
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(propertyType ? { propertyType } : {}),
    ...(usageType ? { usageType } : {}),
  }
  return queryOptions({
    queryKey: ['properties', 'list', query],
    queryFn: () => unwrap(api.GET('/api/properties', { params: { query } })),
    // Changing a filter keeps the current page on screen until the next one arrives.
    placeholderData: keepPreviousData,
  })
}

export function propertyQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['properties', 'detail', id],
    queryFn: () => unwrap(api.GET('/api/properties/{id}', { params: { path: { id } } })),
  })
}

export function propertyKpisQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['kpis', 'property', id],
    queryFn: () => unwrap(api.GET('/api/kpis/properties/{id}', { params: { path: { id } } })),
  })
}

export type FinancingSchedule = Schemas['FinancingSchedule']
export type Installment = FinancingSchedule['installments'][number]

/** Every installment of the property's financing and where it stands today (the API's today). */
export function financingScheduleQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['properties', 'financing-schedule', id],
    queryFn: () => unwrap(api.GET('/api/properties/{id}/financing-schedule', { params: { path: { id } } })),
    // The card offers its own retry, so one quiet attempt is enough.
    retry: 1,
  })
}

/** The properties to choose from in another record's form (the first hundred, by name). */
export const propertyOptionsQueryOptions = queryOptions({
  queryKey: ['properties', 'options'],
  queryFn: () => unwrap(api.GET('/api/properties', { params: { query: { pageSize: 100 } } })),
})

/** Property types with their subtypes; it changes with a deploy, not with use. */
export const propertyCatalogQueryOptions = queryOptions({
  queryKey: ['lookups', 'property-catalog'],
  queryFn: () => unwrap(api.GET('/api/lookups/property-catalog')),
  staleTime: Infinity,
})

/** Municipalities whose name starts like `search`, for the address. */
export function citiesQueryOptions(search: string) {
  return queryOptions({
    queryKey: ['lookups', 'cities', search],
    queryFn: () => unwrap(api.GET('/api/lookups/cities', { params: { query: { search, limit: 8 } } })),
    enabled: search.length >= 2,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  })
}

