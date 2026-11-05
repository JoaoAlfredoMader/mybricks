import { Link } from '@tanstack/react-router'
import { ArrowLeft, MapPin, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DetailCard } from '@/components/detail-card'
import { StatTile } from '@/components/stat-tile'
import { Button, buttonVariants } from '@/components/ui/button'
import { PropertyContracts } from '@/features/contracts/components/property-contracts'
import { takesContracts } from '@/features/contracts/lib/labels'
import { CashFlowSection } from '@/features/finances/components/cash-flow-section'
import { PropertyTransactions } from '@/features/finances/components/property-transactions'
import { PropertyReservations } from '@/features/reservations/components/property-reservations'
import { ApiError } from '@/lib/api/client'
import { formatArea, formatCompactMoney, formatDate, formatMoney, formatRate, formatWholeMoney } from '@/lib/format'
import type { Property, PropertyCatalog, PropertyKpis } from '../api/queries'
import {
  ACQUISITION_LABEL,
  CONSERVATION_LABEL,
  IRR_UNAVAILABLE,
  PROPERTY_TYPE_LABEL,
  USAGE_LABEL,
} from '../lib/labels'
import { useDeleteProperty } from '../hooks/use-property-mutations'
import { DocumentList } from './document-list'
import { FinancingSection } from './financing-section'
import { ListingStatusCard } from './listing-status-card'
import { PhotoGallery } from './photo-gallery'
import { SaleBadge } from './sale-badge'
import { StatusBadge } from './status-badge'

const REVENUE_SOURCE: Record<PropertyKpis['revenueSource'], string> = {
  manual: 'Aluguel informado no imóvel',
  contract: 'Aluguel do contrato ativo',
  reservations: 'Média das reservas dos últimos 12 meses',
  none: 'Sem receita',
}

interface PropertyDetailPageProps {
  property: Property
  kpis: PropertyKpis
  catalog: PropertyCatalog | undefined
  clientName: string | undefined
  /** False while a platform admin impersonates: the API refuses every DELETE then. */
  canDelete: boolean
}

function DeletePropertyButton({ property }: { property: Property }) {
  const remove = useDeleteProperty(property.id)
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="lg" className="h-10 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 aria-hidden="true" />
          Excluir
        </Button>
      }
      title={`Excluir ${property.name}?`}
      description="O imóvel sai da carteira com tudo o que é dele: fotos, documentos, contratos, reservas, propostas e lançamentos. Não dá para desfazer."
      confirmLabel="Excluir imóvel"
      onConfirm={() => remove.mutateAsync()}
      errorMessage={(error) =>
        error instanceof ApiError && error.status === 403
          ? 'Exclusões ficam bloqueadas enquanto você vê o sistema como outra pessoa.'
          : 'Não foi possível excluir agora. Tente de novo.'
      }
    />
  )
}

function count(value: number | null) {
  return value === null ? null : String(value)
}

function addressLines(address: NonNullable<Property['address']>) {
  const street = [address.street, address.number].filter(Boolean).join(', ')
  const line1 = [street, address.complement].filter(Boolean).join(' · ')
  const line2 = [address.neighborhood, `${address.city}, ${address.state}`, address.postalCode].filter(Boolean).join(' · ')
  return [line1, line2]
}

export function PropertyDetailPage({ property, kpis, catalog, clientName, canDelete }: PropertyDetailPageProps) {
  const subtype = catalog
    ?.find((entry) => entry.propertyType === property.propertyType)
    ?.subtypes.find((s) => s.id === property.subtypeId)?.name
  const kind = [PROPERTY_TYPE_LABEL[property.propertyType], subtype, USAGE_LABEL[property.usageType]]
    .filter(Boolean)
    .join(' · ')
  const irrReason = kpis.irr.unavailableReason
  const { acquisition, financing, legalRecord, manualRental } = property

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <Link
        to="/app/imoveis"
        className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Imóveis
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{property.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{kind}</p>
          {property.address && (
            <p className="mt-3 flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>
                {addressLines(property.address).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {property.forSale && <SaleBadge />}
          <span className="rounded-full border bg-card px-3.5 py-2 text-sm">
            <StatusBadge status={property.status} />
          </span>
          {canDelete && <DeletePropertyButton property={property} />}
          <Link
            to="/app/imoveis/$propertyId/editar"
            params={{ propertyId: property.id }}
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10 px-5' })}
          >
            <Pencil aria-hidden="true" />
            Editar
          </Link>
        </div>
      </header>

      <section aria-label="Indicadores do imóvel" className="mt-6">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatTile
            label="Valor estimado"
            value={property.estimatedValueCents === null ? '—' : formatCompactMoney(property.estimatedValueCents)}
            hint={property.ownershipPercentage < 100 ? `${property.ownershipPercentage}% é seu` : undefined}
          />
          <StatTile
            label="Receita anual"
            value={formatCompactMoney(kpis.annualRevenueCents, { digits: 1 })}
            hint={REVENUE_SOURCE[kpis.revenueSource]}
          />
          <StatTile
            label="NOI anual"
            value={formatCompactMoney(kpis.noiCents, { digits: 1 })}
            hint={`Despesas de ${formatCompactMoney(kpis.annualExpensesCents, { digits: 1 })}`}
          />
          <StatTile
            label="Yield bruto"
            value={formatRate(kpis.grossYield)}
            hint={kpis.includedInPortfolio ? undefined : 'Uso sem renda: fora do rendimento'}
          />
          <StatTile label="Cap rate" value={formatRate(kpis.capRate)} />
          <StatTile
            label="TIR"
            value={irrReason ? '—' : formatRate(kpis.irr.annualRate)}
            hint={irrReason ? IRR_UNAVAILABLE[irrReason] : kpis.irr.months ? `Em ${kpis.irr.months} meses` : undefined}
          />
        </dl>
      </section>

      {property.forSale && (
        <div className="mt-4">
          <ListingStatusCard propertyId={property.id} forSale={property.forSale} />
        </div>
      )}

      <div className="mt-4">
        <PhotoGallery propertyId={property.id} propertyName={property.name} canDelete={canDelete} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DetailCard
          title="Características"
          items={[
            { label: 'Área total', value: property.totalArea === null ? null : formatArea(property.totalArea) },
            { label: 'Área privativa', value: property.privateArea === null ? null : formatArea(property.privateArea) },
            { label: 'Quartos', value: count(property.bedrooms) },
            { label: 'Suítes', value: count(property.suites) },
            { label: 'Banheiros', value: count(property.bathrooms) },
            {
              label: 'Vagas',
              value: property.parkingSpotLabel
                ? `${property.parkingSpaces ?? 1} (${property.parkingSpotLabel})`
                : count(property.parkingSpaces),
            },
            { label: 'Construído em', value: count(property.builtYear) },
            {
              label: 'Conservação',
              value: property.conservationState ? CONSERVATION_LABEL[property.conservationState] : null,
            },
            { label: 'Ocupação esperada', value: `${property.occupancyRate}%` },
          ]}
        />

        <div className="grid content-start gap-4">
          <DetailCard
            title="Proprietário e gestão"
            items={[
              {
                label: 'Cliente',
                value: property.clientId ? (
                  <Link
                    to="/app/clientes/$clientId"
                    params={{ clientId: property.clientId }}
                    className="underline-offset-4 hover:underline"
                  >
                    {clientName ?? '…'}
                  </Link>
                ) : null,
              },
              { label: 'Participação', value: `${property.ownershipPercentage}%` },
              { label: 'Imobiliária', value: property.agencyName },
            ]}
          />
          <DetailCard
            title="Locação"
            items={[
              {
                label: 'Aluguel vem de',
                value: property.rentalMode === 'contract' ? 'Contrato ativo' : 'Valores informados no imóvel',
              },
              ...(manualRental
                ? [
                    { label: 'Inquilino', value: manualRental.tenantName },
                    { label: 'Aluguel mensal', value: formatMoney(manualRental.monthlyRentCents) },
                    { label: 'Vencimento', value: manualRental.dueDay ? `Dia ${manualRental.dueDay}` : null },
                  ]
                : []),
              { label: 'Despesas por ano', value: formatMoney(property.annualExpensesCents) },
            ]}
          />
        </div>

        {acquisition && (
          <DetailCard
            title="Aquisição"
            items={[
              { label: 'Forma', value: ACQUISITION_LABEL[acquisition.acquisitionType] },
              { label: 'Data', value: acquisition.acquiredOn ? formatDate(acquisition.acquiredOn) : null },
              { label: 'Custo', value: acquisition.costCents === null ? null : formatWholeMoney(acquisition.costCents) },
            ]}
          />
        )}

        <DetailCard
          title="Documentação"
          items={[
            {
              label: 'Registro',
              value: legalRecord
                ? legalRecord.registrationStatus === 'regular'
                  ? 'Regular'
                  : ['Irregular', legalRecord.irregularityDescription].filter(Boolean).join(': ')
                : null,
            },
            { label: 'Matrícula', value: legalRecord?.registryNumber },
            { label: 'Cartório', value: legalRecord?.registryOffice },
            { label: 'Seguro', value: property.insurance ? (property.insurance.description ?? 'Segurado') : 'Sem seguro' },
          ]}
        />

        {property.notes && (
          <DetailCard title="Observações">
            <p className="mt-3 text-sm whitespace-pre-line">{property.notes}</p>
          </DetailCard>
        )}

        {property.usageType === 'short_stay' && <PropertyReservations propertyId={property.id} />}
        {takesContracts(property) && <PropertyContracts propertyId={property.id} />}
        <CashFlowSection propertyId={property.id} className="lg:col-span-2" />
        <PropertyTransactions propertyId={property.id} />
        {financing && <FinancingSection propertyId={property.id} financing={financing} />}
      </div>

      <div className="mt-4">
        <DocumentList propertyId={property.id} canDelete={canDelete} />
      </div>
    </main>
  )
}
