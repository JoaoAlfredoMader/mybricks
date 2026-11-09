import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { Info, Plus } from 'lucide-react'
import { FilterSelect } from '@/components/filter-select'
import { Pagination } from '@/components/pagination'
import { Button, buttonVariants } from '@/components/ui/button'
import { propertyOptionsQueryOptions } from '@/features/properties/api/queries'
import { formatNumericDate } from '@/lib/format'
import { type TransactionFilters, transactionCategoriesQueryOptions, transactionsQueryOptions } from '../api/queries'
import { RECURRING_LABEL, recurrence, signedAmount, TRANSACTION_TYPE_LABEL } from '../lib/labels'
import { PERIOD_LABEL } from '../lib/period'
import { CashFlowSection } from './cash-flow-section'
import { TransactionTypeBadge } from './transaction-type-badge'

interface TransactionsPageProps {
  filters: TransactionFilters
  /** Updates the URL; any change but the page goes back to page 1. */
  onFiltersChange: (filters: TransactionFilters) => void
}

export function TransactionsPage({ filters, onFiltersChange }: TransactionsPageProps) {
  const list = useQuery(transactionsQueryOptions(filters))
  const categories = useQuery(transactionCategoriesQueryOptions).data ?? []
  const properties = useQuery(propertyOptionsQueryOptions).data?.items ?? []
  const filtered = Boolean(filters.type || filters.categoryId || filters.propertyId || filters.recurring || filters.period)
  const data = list.data

  // The category menu follows the type: picking "Despesas" leaves only expense categories, in the API's order (by name).
  const categoryOptions = categories
    .filter((c) => !filters.type || c.transactionType === filters.type)
    .map((c) => ({ value: String(c.id), label: c.name }))
  const propertyOptions = properties.map((p) => ({ value: p.id, label: p.name }))
  const set = (change: Partial<TransactionFilters>) => onFiltersChange({ ...filters, ...change, page: 1 })

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Finanças</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data
              ? `${data.total} ${data.total === 1 ? 'lançamento' : 'lançamentos'}${filtered ? ' com estes filtros' : ''}, do mais recente para o mais antigo`
              : ' '}
          </p>
        </div>
        <Link
          to="/app/financas/novo"
          search={filters.propertyId ? { propertyId: filters.propertyId } : {}}
          className={buttonVariants({ size: 'lg', className: 'h-10 px-5' })}
        >
          <Plus aria-hidden="true" />
          Novo lançamento
        </Link>
      </header>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-pastel-cyan px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Receitas e despesas fora da rotina: reformas, obras, honorários, indenizações, a venda de um imóvel, parcelas do
          financiamento… Elas entram na TIR de cada imóvel. Custos fixos como IPTU e condomínio vão nas despesas por ano
          do próprio imóvel, que é o que o yield, o cap rate e o NOI usam.
        </span>
      </p>

      <CashFlowSection
        className="mt-6"
        window={filters.flow ?? 'last-12-months'}
        onWindowChange={(flow) => onFiltersChange({ ...filters, flow: flow === 'last-12-months' ? undefined : flow })}
      />

      <h2 className="mt-10 font-semibold">Lançamentos</h2>
      <div role="search" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <FilterSelect
          label="Tipo"
          allLabel="Receitas e despesas"
          value={filters.type}
          options={TRANSACTION_TYPE_LABEL}
          onChange={(type) => {
            const category = categories.find((c) => c.id === filters.categoryId)
            set({ type, categoryId: type && category && category.transactionType !== type ? undefined : filters.categoryId })
          }}
        />
        <FilterSelect
          label="Categoria"
          allLabel="Todas as categorias"
          value={filters.categoryId ? String(filters.categoryId) : undefined}
          options={categoryOptions}
          onChange={(categoryId) => set({ categoryId: categoryId ? Number(categoryId) : undefined })}
        />
        <FilterSelect
          label="Imóvel"
          allLabel="Todos os imóveis"
          value={filters.propertyId}
          options={propertyOptions}
          onChange={(propertyId) => set({ propertyId })}
        />
        <FilterSelect
          label="Recorrência"
          allLabel="Avulsos e recorrentes"
          value={filters.recurring}
          options={RECURRING_LABEL}
          onChange={(recurring) => set({ recurring })}
        />
        <FilterSelect
          label="Período"
          allLabel="Qualquer data"
          value={filters.period}
          options={PERIOD_LABEL}
          onChange={(period) => set({ period })}
        />
      </div>
      <section
        aria-label="Lista de lançamentos"
        aria-busy={list.isFetching}
        className={cn('mt-4 rounded-2xl border bg-card transition-opacity', list.isPlaceholderData && 'opacity-60')}
      >
        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="border-b text-xs whitespace-nowrap text-muted-foreground">
                  <th scope="col" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">Data</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Categoria</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Imóvel</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Recorrência</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th scope="col" className="py-3 pr-5 pl-4 text-right font-medium sm:pr-6">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((transaction) => (
                  <tr key={transaction.id} className="border-b last:border-b-0 hover:bg-muted/50">
                    <td className="py-3 pr-4 pl-5 whitespace-nowrap tabular-nums sm:pl-6">
                      {formatNumericDate(transaction.occurredOn)}
                    </td>
                    <th scope="row" className="px-4 py-3 text-left font-medium">
                      <Link
                        to="/app/financas/$transactionId/editar"
                        params={{ transactionId: transaction.id }}
                        className="rounded-sm hover:underline hover:underline-offset-4"
                      >
                        {transaction.categoryName}
                      </Link>
                      {transaction.description && (
                        <span className="block max-w-xs truncate text-xs font-normal text-muted-foreground">
                          {transaction.description}
                        </span>
                      )}
                    </th>
                    <td className="px-4 py-3">
                      <Link
                        to="/app/imoveis/$propertyId"
                        params={{ propertyId: transaction.propertyId }}
                        className="rounded-sm hover:underline hover:underline-offset-4"
                      >
                        {transaction.propertyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{recurrence(transaction)}</td>
                    <td className="px-4 py-3">
                      <TransactionTypeBadge type={transaction.type} />
                    </td>
                    <td className="py-3 pr-5 pl-4 text-right font-medium whitespace-nowrap tabular-nums sm:pr-6">
                      {signedAmount(transaction)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : data ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="font-medium">{filtered ? 'Nenhum lançamento encontrado' : 'Nenhum lançamento ainda'}</p>
            <p className="text-sm text-muted-foreground">
              {filtered ? 'Tire algum filtro para ver mais.' : 'Reformas, obras, indenizações e outras receitas e despesas aparecem aqui.'}
            </p>
            {filtered && (
              <Button variant="outline" onClick={() => onFiltersChange({ page: 1, flow: filters.flow })}>
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
