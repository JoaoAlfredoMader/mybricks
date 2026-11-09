import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { agencyOptionsQueryOptions, clientOptionsQueryOptions } from '@/features/clients/api/queries'
import { propertyCatalogQueryOptions } from '@/features/properties/api/queries'
import { PropertyFormPage } from '@/features/properties/components/property-form-page'
import { useCreateProperty } from '@/features/properties/hooks/use-property-mutations'
import { EMPTY_PROPERTY_FORM } from '@/features/properties/lib/property-form'

export const Route = createFileRoute('/_authenticated/app/imoveis/novo')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(propertyCatalogQueryOptions),
      queryClient.ensureQueryData(clientOptionsQueryOptions),
      queryClient.ensureQueryData(agencyOptionsQueryOptions),
    ]),
  component: NewPropertyRoute,
})

export function NewPropertyRoute() {
  const navigate = useNavigate()
  const create = useCreateProperty()
  const catalog = useSuspenseQuery(propertyCatalogQueryOptions).data
  const clients = useSuspenseQuery(clientOptionsQueryOptions).data.items
  const agencies = useSuspenseQuery(agencyOptionsQueryOptions).data.items

  return (
    <PropertyFormPage
      title="Novo imóvel"
      description="Só o nome, o tipo e o uso são obrigatórios; o resto pode vir depois."
      initialValues={EMPTY_PROPERTY_FORM}
      catalog={catalog}
      clients={clients}
      agencies={agencies}
      submitLabel="Cadastrar imóvel"
      cancel={{ to: '/app/imoveis' }}
      onSubmit={async (request) => {
        const property = await create.mutateAsync(request)
        await navigate({ to: '/app/imoveis/$propertyId', params: { propertyId: property.id } })
      }}
    />
  )
}
