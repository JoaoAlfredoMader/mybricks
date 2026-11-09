import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { FormPage } from '@/components/form/form-page'
import { Button } from '@/components/ui/button'
import { transactionCategoriesQueryOptions, transactionQueryOptions } from '@/features/finances/api/queries'
import { TransactionForm } from '@/features/finances/components/transaction-form'
import { TransactionNotFound } from '@/features/finances/components/transaction-not-found'
import { useDeleteTransaction, useUpdateTransaction } from '@/features/finances/hooks/use-transaction-mutations'
import { fromTransaction, toUpdateRequest, transactionErrorMessage } from '@/features/finances/lib/transaction-form'
import { loadOrNotFound } from '@/lib/load-or-not-found'

export const Route = createFileRoute('/_authenticated/app/financas/$transactionId/editar')({
  loader: ({ context: { queryClient }, params: { transactionId } }) =>
    loadOrNotFound([
      // Always the stored version: the form must not start from a stale copy.
      queryClient.fetchQuery({ ...transactionQueryOptions(transactionId), staleTime: 0 }),
      queryClient.ensureQueryData(transactionCategoriesQueryOptions),
    ]),
  component: EditTransactionRoute,
  notFoundComponent: TransactionNotFound,
})

function DeleteTransactionButton({ transactionId }: { transactionId: string }) {
  const remove = useDeleteTransaction(transactionId)
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="lg" className="h-10 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 aria-hidden="true" />
          Excluir
        </Button>
      }
      title="Excluir este lançamento?"
      description="Ele sai das finanças e da TIR do imóvel. Se for recorrente, todas as ocorrências saem junto. Não dá para desfazer."
      confirmLabel="Excluir lançamento"
      onConfirm={() => remove.mutateAsync()}
      errorMessage={(error) => transactionErrorMessage(error, 'Não foi possível excluir agora. Tente de novo.')}
    />
  )
}

export function EditTransactionRoute() {
  const { transactionId } = Route.useParams()
  const { session } = Route.useRouteContext()
  const navigate = useNavigate()
  const update = useUpdateTransaction(transactionId)
  const transaction = useSuspenseQuery(transactionQueryOptions(transactionId)).data
  const categories = useSuspenseQuery(transactionCategoriesQueryOptions).data
  const back = { to: '/app/financas' } as const

  return (
    <FormPage
      title={`Editar ${transaction.categoryName.toLowerCase()}`}
      description={`${transaction.propertyName}. O imóvel não muda; para outro imóvel, cadastre um novo lançamento.`}
      back={back}
      actions={session.impersonatedById === null && <DeleteTransactionButton transactionId={transactionId} />}
    >
      <TransactionForm
        initialValues={fromTransaction(transaction)}
        categories={categories}
        propertyName={transaction.propertyName}
        submitLabel="Salvar alterações"
        cancel={back}
        onSubmit={async (values) => {
          await update.mutateAsync(toUpdateRequest(values))
          await navigate(back)
        }}
      />
    </FormPage>
  )
}
