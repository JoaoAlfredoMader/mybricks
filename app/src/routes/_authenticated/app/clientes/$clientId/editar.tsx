import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FormPage } from '@/components/form/form-page'
import { clientQueryOptions } from '@/features/clients/api/queries'
import { ClientForm } from '@/features/clients/components/client-form'
import { ClientNotFound } from '@/features/clients/components/client-not-found'
import { useUpdateClient } from '@/features/clients/hooks/use-client-mutations'
import { fromClient } from '@/features/clients/lib/client-form'
import { loadOrNotFound } from '@/lib/load-or-not-found'

export const Route = createFileRoute('/_authenticated/app/clientes/$clientId/editar')({
  // Always the stored version: the form must not start from a stale copy.
  loader: ({ context: { queryClient }, params: { clientId } }) =>
    loadOrNotFound([queryClient.fetchQuery({ ...clientQueryOptions(clientId), staleTime: 0 })]),
  component: EditClientRoute,
  notFoundComponent: ClientNotFound,
})

export function EditClientRoute() {
  const { clientId } = Route.useParams()
  const navigate = useNavigate()
  const update = useUpdateClient(clientId)
  const client = useSuspenseQuery(clientQueryOptions(clientId)).data
  const back = { to: '/app/clientes/$clientId', params: { clientId } } as const

  return (
    <FormPage title={`Editar ${client.name}`} description="As mudanças valem a partir de agora." back={back}>
      <ClientForm
        initialValues={fromClient(client)}
        submitLabel="Salvar alterações"
        cancel={back}
        onSubmit={async (request) => {
          await update.mutateAsync(request)
          await navigate(back)
        }}
      />
    </FormPage>
  )
}
