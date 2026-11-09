import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { contractQueryOptions } from '@/features/contracts/api/queries'
import { ContractDetailPage } from '@/features/contracts/components/contract-detail-page'
import { ContractNotFound } from '@/features/contracts/components/contract-not-found'
import { loadOrNotFound } from '@/lib/load-or-not-found'

export const Route = createFileRoute('/_authenticated/app/contratos/$contractId/')({
  loader: ({ context: { queryClient }, params: { contractId } }) =>
    loadOrNotFound([queryClient.ensureQueryData(contractQueryOptions(contractId))]),
  component: ContractDetailRoute,
  notFoundComponent: ContractNotFound,
})

export function ContractDetailRoute() {
  const { contractId } = Route.useParams()
  const contract = useSuspenseQuery(contractQueryOptions(contractId)).data
  return <ContractDetailPage contract={contract} />
}
