import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { Plus } from 'lucide-react'
import { FilterSelect } from '@/components/filter-select'
import { Pagination } from '@/components/pagination'
import { SearchInput } from '@/components/search-input'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatArea, formatWholeMoney } from '@/lib/format'
import { type PropertyFilters, propertiesQueryOptions, propertyCatalogQueryOptions } from '../api/queries'
import { PROPERTY_TYPE_LABEL, USAGE_LABEL } from '../lib/labels'
import { SaleBadge } from './sale-badge'
import { StatusBadge } from './status-badge'

interface PropertiesPageProps {
  filters: PropertyFilters
  /** Updates the URL; any change but the page goes back to page 1. */
  onFiltersChange: (filters: PropertyFilters) => void
}

export function PropertiesPage({ filters, onFiltersChange }: PropertiesPageProps) {
  const list = useQuery(propertiesQueryOptions(filters))
  const catalog = useQuery(propertyCatalogQueryOptions).data
  const subtypeName = new Map(catalog?.flatMap((entry) => entry.subtypes.map((s) => [s.id, s.name] as const)))

  const filtered = Boolean(filters.search || filters.propertyType || filters.usageType)
  const data = list.data

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Imóveis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} ${data.total === 1 ? 'imóvel' : 'imóveis'}${filtered ? ' com estes filtros' : ''}` : ' '}
          </p>
        </div>
        <Link to="/app/imoveis/novo" className={buttonVariants({ size: 'lg', className: 'h-10 px-5' })}>
          <Plus aria-hidden="true" />
          Novo imóvel
        </Link>
      </header>

      <div role="search" className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <SearchInput
          label="Buscar pelo nome"
          value={filters.search}
          onSearch={(search) => onFiltersChange({ ...filters, search, page: 1 })}
        />
        <FilterSelect
          label="Tipo"
          allLabel="Todos os tipos"
          value={filters.propertyType}
          options={PROPERTY_TYPE_LABEL}
          onChange={(propertyType) => onFiltersChange({ ...filters, propertyType, page: 1 })}
        />
        <FilterSelect
          label="Uso"
          allLabel="Todos os usos"
          value={filters.usageType}
          options={USAGE_LABEL}
          onChange={(usageType) => onFiltersChange({ ...filters, usageType, page: 1 })}
        />
      </div>

      <section
        aria-label="Lista de imóveis"
        aria-busy={list.isFetching}
        className={cn('mt-4 rounded-2xl border bg-card transition-opacity', list.isPlaceholderData && 'opacity-60')}
      >
        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b text-xs whitespace-nowrap text-muted-foreground">
                  <th scope="col" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">Imóvel</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Uso</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Situação</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Área privativa</th>
                  <th scope="col" className="py-3 pr-5 pl-4 text-right font-medium sm:pr-6">Valor estimado</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((property) => {
                  const area = property.privateArea ?? property.totalArea
                  return (
                    <tr key={property.id} className="border-b last:border-b-0 hover:bg-muted/50">
                      <th scope="row" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">
                        <Link
                          to="/app/imoveis/$propertyId"
                          params={{ propertyId: property.id }}
                          className="rounded-sm hover:underline hover:underline-offset-4"
                        >
                          {property.name}
                        </Link>
                        {property.address && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {property.address.city}, {property.address.state}
                          </span>
                        )}
                      </th>
                      <td className="px-4 py-3">
                        {PROPERTY_TYPE_LABEL[property.propertyType]}
                        {property.subtypeId !== null && subtypeName.has(property.subtypeId) && (
                          <span className="block text-xs text-muted-foreground">{subtypeName.get(property.subtypeId)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{USAGE_LABEL[property.usageType]}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={property.status} />
                        {property.forSale && (
                          <span className="mt-1 block">
                            <SaleBadge />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                        {area === null ? '—' : formatArea(area)}
                      </td>
                      <td className="py-3 pr-5 pl-4 text-right whitespace-nowrap tabular-nums sm:pr-6">
                        {property.estimatedValueCents === null ? '—' : formatWholeMoney(property.estimatedValueCents)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : data ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="font-medium">{filtered ? 'Nenhum imóvel encontrado' : 'Nenhum imóvel cadastrado ainda'}</p>
            <p className="text-sm text-muted-foreground">
              {filtered ? 'Tente outro nome ou tire algum filtro.' : 'Os imóveis da carteira aparecem aqui.'}
            </p>
            {filtered && (
              <Button variant="outline" onClick={() => onFiltersChange({ page: 1 })}>
                Limpar filtros
              </Button>
            )}
          </div>
        ) : null}
      </section>

      {data && data.total > data.pageSize && (
        <div className="mt-4">
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(page) => onFiltersChange({ ...filters, page })}
          />
        </div>
      )}
    </main>
  )
}
