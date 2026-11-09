import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { contractQueryOptions } from '@/features/contracts/api/queries'
import { EditContractForm } from '@/features/contracts/components/contract-form'
import { FormPage } from '@/components/form/form-page'
import { ContractNotFound } from '@/features/contracts/components/contract-not-found'
import { useUpdateContract } from '@/features/contracts/hooks/use-contract-mutations'
import { fromContract } from '@/features/contracts/lib/contract-form'
import { loadOrNotFound } from '@/lib/load-or-not-found'

export const Route = createFileRoute('/_authenticated/app/contratos/$contractId/editar')({
  loader: async ({ context: { queryClient }, params: { contractId } }) => {
    // Always the stored version: the form must not start from a stale copy.
    const options = { ...contractQueryOptions(contractId), staleTime: 0 }
    await loadOrNotFound([queryClient.fetchQuery(options)])
    // Only active contracts can change; the others go back to their page.
    if (queryClient.getQueryData(options.queryKey)?.status !== 'active') {
      throw redirect({ to: '/app/contratos/$contractId', params: { contractId } })
    }
  },
  component: EditContractRoute,
  notFoundComponent: ContractNotFound,
})

export function EditContractRoute() {
  const { contractId } = Route.useParams()
  const navigate = useNavigate()
  const update = useUpdateContract(contractId)
  const contract = useSuspenseQuery(contractQueryOptions(contractId)).data
  const back = { to: '/app/contratos/$contractId', params: { contractId } } as const

  return (
    <FormPage
      title={`Editar contrato de ${contract.occupant.name}`}
      description={`${contract.propertyName}. O imóvel, o ocupante e o início não mudam; para trocar, cadastre um novo contrato.`}
      back={back}
    >
      <EditContractForm
        contract={contract}
        initialValues={fromContract(contract)}
        cancel={back}
        onSubmit={async (request) => {
          await update.mutateAsync(request)
          await navigate(back)
        }}
      />
    </FormPage>
  )
}
