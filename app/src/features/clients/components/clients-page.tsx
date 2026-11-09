import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { Plus } from 'lucide-react'
import { FilterSelect } from '@/components/filter-select'
import { Pagination } from '@/components/pagination'
import { SearchInput } from '@/components/search-input'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatDocument, formatPhone } from '@/lib/format'
import { type ClientFilters, clientsQueryOptions } from '../api/queries'
import { PERSON_TYPE_LABEL } from '../lib/labels'
import { SectionTabs } from './section-tabs'

interface ClientsPageProps {
  filters: ClientFilters
  /** Updates the URL; any change but the page goes back to page 1. */
  onFiltersChange: (filters: ClientFilters) => void
}

export function ClientsPage({ filters, onFiltersChange }: ClientsPageProps) {
  const list = useQuery(clientsQueryOptions(filters))
  const filtered = Boolean(filters.search || filters.personType)
  const data = list.data

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} ${data.total === 1 ? 'cliente' : 'clientes'}${filtered ? ' com estes filtros' : ''}, os donos dos imóveis` : ' '}
          </p>
        </div>
        <Link to="/app/clientes/novo" className={buttonVariants({ size: 'lg', className: 'h-10 px-5' })}>
          <Plus aria-hidden="true" />
          Novo cliente
        </Link>
      </header>

      <SectionTabs />

      <div role="search" className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <SearchInput
          label="Buscar pelo nome"
          value={filters.search}
          onSearch={(search) => onFiltersChange({ ...filters, search, page: 1 })}
        />
        <FilterSelect
          label="Tipo de pessoa"
          allLabel="Todos os tipos"
          value={filters.personType}
          options={PERSON_TYPE_LABEL}
          onChange={(personType) => onFiltersChange({ ...filters, personType, page: 1 })}
        />
      </div>

      <section
        aria-label="Lista de clientes"
        aria-busy={list.isFetching}
        className={cn('mt-4 rounded-2xl border bg-card transition-opacity', list.isPlaceholderData && 'opacity-60')}
      >
        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b text-xs whitespace-nowrap text-muted-foreground">
                  <th scope="col" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">Nome</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">CPF ou CNPJ</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">E-mail</th>
                  <th scope="col" className="py-3 pr-5 pl-4 text-left font-medium sm:pr-6">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((client) => (
                  <tr key={client.id} className="border-b last:border-b-0 hover:bg-muted/50">
                    <th scope="row" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">
                      <Link
                        to="/app/clientes/$clientId"
                        params={{ clientId: client.id }}
                        className="rounded-sm hover:underline hover:underline-offset-4"
                      >
                        {client.name}
                      </Link>
                    </th>
                    <td className="px-4 py-3 whitespace-nowrap">{PERSON_TYPE_LABEL[client.personType]}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{client.document ? formatDocument(client.document) : '—'}</td>
                    <td className="px-4 py-3">{client.email ?? '—'}</td>
                    <td className="py-3 pr-5 pl-4 whitespace-nowrap tabular-nums sm:pr-6">
                      {client.whatsapp ? formatPhone(client.whatsapp) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : data ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="font-medium">{filtered ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}</p>
            <p className="text-sm text-muted-foreground">
              {filtered ? 'Tente outro nome ou tire algum filtro.' : 'Os donos dos imóveis da carteira aparecem aqui.'}
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
