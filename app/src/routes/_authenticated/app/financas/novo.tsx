import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { FormPage } from '@/components/form/form-page'
import { transactionCategoriesQueryOptions } from '@/features/finances/api/queries'
import { TransactionForm } from '@/features/finances/components/transaction-form'
import { useCreateTransaction } from '@/features/finances/hooks/use-transaction-mutations'
import { emptyTransaction, toCreateRequest } from '@/features/finances/lib/transaction-form'
import { propertyOptionsQueryOptions } from '@/features/properties/api/queries'

export const Route = createFileRoute('/_authenticated/app/financas/novo')({
  // Opened from a property, the form starts with that property chosen.
  validateSearch: z.object({ propertyId: z.uuid().optional().catch(undefined) }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(transactionCategoriesQueryOptions),
      queryClient.ensureQueryData(propertyOptionsQueryOptions),
    ]),
  component: NewTransactionRoute,
})

export function NewTransactionRoute() {
  const { propertyId } = Route.useSearch()
  const navigate = useNavigate()
  const create = useCreateTransaction()
  const categories = useSuspenseQuery(transactionCategoriesQueryOptions).data
  const properties = useSuspenseQuery(propertyOptionsQueryOptions).data.items
  const preselected = properties.some((p) => p.id === propertyId) ? propertyId : undefined
  const back = preselected
    ? ({ to: '/app/imoveis/$propertyId', params: { propertyId: preselected } } as const)
    : ({ to: '/app/financas' } as const)

  return (
    <FormPage
      title="Novo lançamento"
      description="Uma receita ou despesa fora da rotina, avulsa ou que se repete todo mês. Custos fixos como IPTU e condomínio vão nas despesas por ano do imóvel."
      back={back}
    >
      <TransactionForm
        initialValues={emptyTransaction(preselected)}
        categories={categories}
        properties={properties}
        submitLabel="Cadastrar lançamento"
        cancel={back}
        onSubmit={async (values) => {
          await create.mutateAsync(toCreateRequest(values))
          await navigate(preselected ? back : { to: '/app/financas' })
        }}
      />
    </FormPage>
  )
}
