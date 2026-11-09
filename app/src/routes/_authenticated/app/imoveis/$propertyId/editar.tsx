import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { agencyOptionsQueryOptions, clientOptionsQueryOptions } from '@/features/clients/api/queries'
import { propertyCatalogQueryOptions, propertyQueryOptions } from '@/features/properties/api/queries'
import { PropertyFormPage } from '@/features/properties/components/property-form-page'
import { PropertyNotFound } from '@/features/properties/components/property-not-found'
import { useUpdateProperty } from '@/features/properties/hooks/use-property-mutations'
import { loadOrNotFound } from '@/lib/load-or-not-found'
import { fromProperty } from '@/features/properties/lib/property-form'

export const Route = createFileRoute('/_authenticated/app/imoveis/$propertyId/editar')({
  loader: ({ context: { queryClient }, params: { propertyId } }) =>
    loadOrNotFound([
      // Always the stored version: the form must not start from a stale copy.
      queryClient.fetchQuery({ ...propertyQueryOptions(propertyId), staleTime: 0 }),
      queryClient.ensureQueryData(propertyCatalogQueryOptions),
      queryClient.ensureQueryData(clientOptionsQueryOptions),
      queryClient.ensureQueryData(agencyOptionsQueryOptions),
    ]),
  component: EditPropertyRoute,
  notFoundComponent: PropertyNotFound,
})

export function EditPropertyRoute() {
  const { propertyId } = Route.useParams()
  const navigate = useNavigate()
  const update = useUpdateProperty(propertyId)
  const property = useSuspenseQuery(propertyQueryOptions(propertyId)).data
  const catalog = useSuspenseQuery(propertyCatalogQueryOptions).data
  const clients = useSuspenseQuery(clientOptionsQueryOptions).data.items
  const agencies = useSuspenseQuery(agencyOptionsQueryOptions).data.items
  const back = { to: '/app/imoveis/$propertyId', params: { propertyId } } as const

  return (
    <PropertyFormPage
      title={`Editar ${property.name}`}
      description="As mudanças valem a partir de agora para os indicadores."
      initialValues={fromProperty(property)}
      catalog={catalog}
      clients={clients}
      agencies={agencies}
      submitLabel="Salvar alterações"
      propertyId={propertyId}
      cancel={back}
      onSubmit={async (request) => {
        await update.mutateAsync(request)
        await navigate(back)
      }}
    />
  )
}
