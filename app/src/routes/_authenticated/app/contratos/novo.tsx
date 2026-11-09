import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { propertyOptionsQueryOptions } from '@/features/properties/api/queries'
import { NewContractForm } from '@/features/contracts/components/contract-form'
import { FormPage } from '@/components/form/form-page'
import { useCreateContract } from '@/features/contracts/hooks/use-contract-mutations'
import { emptyNewContract } from '@/features/contracts/lib/contract-form'
import { takesContracts } from '@/features/contracts/lib/labels'

export const Route = createFileRoute('/_authenticated/app/contratos/novo')({
  // Opened from a property, the form starts with that property chosen.
  validateSearch: z.object({ propertyId: z.uuid().optional().catch(undefined) }),
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(propertyOptionsQueryOptions),
  component: NewContractRoute,
})

export function NewContractRoute() {
  const { propertyId } = Route.useSearch()
  const navigate = useNavigate()
  const create = useCreateContract()
  const properties = useSuspenseQuery(propertyOptionsQueryOptions).data.items.filter(takesContracts)
  const preselected = properties.some((p) => p.id === propertyId) ? propertyId : undefined
  const back = preselected
    ? ({ to: '/app/imoveis/$propertyId', params: { propertyId: preselected } } as const)
    : ({ to: '/app/contratos' } as const)

  return (
    <FormPage
      title="Novo contrato"
      description="Se o imóvel já tiver um contrato ativo, ele é encerrado quando este for salvo."
      back={back}
    >
      <NewContractForm
        initialValues={emptyNewContract(preselected)}
        properties={properties}
        cancel={back}
        onSubmit={async (request) => {
          const contract = await create.mutateAsync(request)
          await navigate({ to: '/app/contratos/$contractId', params: { contractId: contract.id } })
        }}
      />
    </FormPage>
  )
}
