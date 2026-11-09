import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { FileText, Plus, X } from 'lucide-react'
import { FilterSelect } from '@/components/filter-select'
import { Pagination } from '@/components/pagination'
import { Button, buttonVariants } from '@/components/ui/button'
import { propertyQueryOptions } from '@/features/properties/api/queries'
import { formatMoney } from '@/lib/format'
import { type ContractFilters, contractsQueryOptions } from '../api/queries'
import { CONTRACT_STATUS_LABEL, CONTRACT_TYPE_LABEL } from '../lib/labels'
import { contractPeriod } from '../lib/period'
import { ContractStatusBadge } from './contract-status-badge'

interface ContractsPageProps {
  filters: ContractFilters
  /** Updates the URL; any change but the page goes back to page 1. */
  onFiltersChange: (filters: ContractFilters) => void
}

export function ContractsPage({ filters, onFiltersChange }: ContractsPageProps) {
  const list = useQuery(contractsQueryOptions(filters))
  const property = useQuery({ ...propertyQueryOptions(filters.propertyId ?? ''), enabled: Boolean(filters.propertyId) }).data
  const filtered = Boolean(filters.status || filters.contractType || filters.propertyId)
  const data = list.data

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Contratos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data
              ? `${data.total} ${data.total === 1 ? 'contrato' : 'contratos'}${filtered ? ' com estes filtros' : ''}, do início mais recente para o mais antigo`
              : ' '}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/contratos/modelo" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10 px-5' })}>
            <FileText aria-hidden="true" />
            Modelo do contrato
          </Link>
          <Link
            to="/app/contratos/novo"
            search={filters.propertyId ? { propertyId: filters.propertyId } : {}}
            className={buttonVariants({ size: 'lg', className: 'h-10 px-5' })}
          >
            <Plus aria-hidden="true" />
            Novo contrato
          </Link>
        </div>
      </header>

      <div role="search" className="mt-6 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-52">
          <FilterSelect
            label="Situação"
            allLabel="Todas as situações"
            value={filters.status}
            options={CONTRACT_STATUS_LABEL}
            onChange={(status) => onFiltersChange({ ...filters, status, page: 1 })}
          />
        </div>
        <div className="w-full sm:w-52">
          <FilterSelect
            label="Tipo"
            allLabel="Todos os tipos"
            value={filters.contractType}
            options={CONTRACT_TYPE_LABEL}
            onChange={(contractType) => onFiltersChange({ ...filters, contractType, page: 1 })}
          />
        </div>
        {filters.propertyId && (
          <span className="inline-flex h-10 items-center gap-1 rounded-full border bg-card pr-1.5 pl-4 text-sm">
            Imóvel: <span className="font-medium">{property?.name ?? '…'}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="Ver contratos de todos os imóveis"
              onClick={() => onFiltersChange({ ...filters, propertyId: undefined, page: 1 })}
            >
              <X aria-hidden="true" />
            </Button>
          </span>
        )}
      </div>

      <section
        aria-label="Lista de contratos"
        aria-busy={list.isFetching}
        className={cn('mt-4 rounded-2xl border bg-card transition-opacity', list.isPlaceholderData && 'opacity-60')}
      >
        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b text-xs whitespace-nowrap text-muted-foreground">
                  <th scope="col" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">Ocupante</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Imóvel</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Vigência</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Aluguel mensal</th>
                  <th scope="col" className="py-3 pr-5 pl-4 text-left font-medium sm:pr-6">Situação</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((contract) => (
                  <tr key={contract.id} className="border-b last:border-b-0 hover:bg-muted/50">
                    <th scope="row" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">
                      <Link
                        to="/app/contratos/$contractId"
                        params={{ contractId: contract.id }}
                        className="rounded-sm hover:underline hover:underline-offset-4"
                      >
                        {contract.occupant.name}
                      </Link>
                    </th>
                    <td className="px-4 py-3">
                      <Link
                        to="/app/imoveis/$propertyId"
                        params={{ propertyId: contract.propertyId }}
                        className="rounded-sm hover:underline hover:underline-offset-4"
                      >
                        {contract.propertyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{CONTRACT_TYPE_LABEL[contract.contractType]}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{contractPeriod(contract)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {contract.rentTerms ? formatMoney(contract.rentTerms.monthlyRentCents) : '—'}
                    </td>
                    <td className="py-3 pr-5 pl-4 sm:pr-6">
                      <ContractStatusBadge status={contract.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : data ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="font-medium">{filtered ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado ainda'}</p>
            <p className="text-sm text-muted-foreground">
              {filtered
                ? 'Tire algum filtro para ver mais.'
                : 'Contratos de locação e de temporada dos imóveis aparecem aqui.'}
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
