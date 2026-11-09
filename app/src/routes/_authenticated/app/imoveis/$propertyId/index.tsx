import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { clientQueryOptions } from '@/features/clients/api/queries'
import {
  propertyCatalogQueryOptions,
  propertyKpisQueryOptions,
  propertyQueryOptions,
} from '@/features/properties/api/queries'
import { PropertyDetailPage } from '@/features/properties/components/property-detail-page'
import { PropertyNotFound } from '@/features/properties/components/property-not-found'
import { loadOrNotFound } from '@/lib/load-or-not-found'

export const Route = createFileRoute('/_authenticated/app/imoveis/$propertyId/')({
  loader: ({ context: { queryClient }, params: { propertyId } }) =>
    loadOrNotFound([
      queryClient.ensureQueryData(propertyQueryOptions(propertyId)),
      queryClient.ensureQueryData(propertyKpisQueryOptions(propertyId)),
      queryClient.ensureQueryData(propertyCatalogQueryOptions),
    ]),
  component: PropertyDetailRoute,
  notFoundComponent: PropertyNotFound,
})

export function PropertyDetailRoute() {
  const { propertyId } = Route.useParams()
  const { session } = Route.useRouteContext()
  const property = useSuspenseQuery(propertyQueryOptions(propertyId)).data
  const kpis = useSuspenseQuery(propertyKpisQueryOptions(propertyId)).data
  const catalog = useQuery(propertyCatalogQueryOptions).data
  const client = useQuery({ ...clientQueryOptions(property.clientId ?? ''), enabled: property.clientId !== null }).data

  return (
    <PropertyDetailPage
      property={property}
      kpis={kpis}
      catalog={catalog}
      clientName={client?.name}
      canDelete={session.impersonatedById === null}
    />
  )
}
