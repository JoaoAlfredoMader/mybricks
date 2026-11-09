import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { FormPage } from '@/components/form/form-page'
import { ClientForm } from '@/features/clients/components/client-form'
import { useCreateClient } from '@/features/clients/hooks/use-client-mutations'
import { EMPTY_CLIENT_FORM } from '@/features/clients/lib/client-form'

export const Route = createFileRoute('/_authenticated/app/clientes/novo')({
  component: NewClientRoute,
})

export function NewClientRoute() {
  const navigate = useNavigate()
  const create = useCreateClient()
  const back = { to: '/app/clientes' } as const

  return (
    <FormPage title="Novo cliente" description="Só o nome é obrigatório; o resto pode vir depois." back={back}>
      <ClientForm
        initialValues={EMPTY_CLIENT_FORM}
        submitLabel="Cadastrar cliente"
        cancel={back}
        onSubmit={async (request) => {
          const client = await create.mutateAsync(request)
          await navigate({ to: '/app/clientes/$clientId', params: { clientId: client.id } })
        }}
      />
    </FormPage>
  )
}
