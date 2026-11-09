import { queryOptions } from '@tanstack/react-query'
import { api, type Schemas, unwrap } from '@/lib/api/client'

export type ContractTemplate = Schemas['ContractTemplate']
export type SaveTemplateRequest = Schemas['UpdateContractTemplateRequest']

/**
 * The organization's contract template, or the default one until it saves its own, with the
 * tokens that can be typed in it. The editor always starts from the stored version.
 */
export const contractTemplateQueryOptions = queryOptions({
  queryKey: ['contract-template'],
  queryFn: () => unwrap(api.GET('/api/contract-template')),
})
