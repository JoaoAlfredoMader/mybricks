import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { Plus } from 'lucide-react'
import { FilterSelect } from '@/components/filter-select'
import { Pagination } from '@/components/pagination'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatMoney } from '@/lib/format'
import { type ReservationFilters, reservationsQueryOptions, shortStayPropertiesQueryOptions } from '../api/queries'
import { RESERVATION_STATUS_LABEL, stayPeriod } from '../lib/labels'
import { ReservationStatusBadge } from './reservation-status-badge'
import { ReservationViewTabs } from './reservation-view-tabs'

interface ReservationsPageProps {
  filters: ReservationFilters
  /** Updates the URL; any change but the page goes back to page 1. */
  onFiltersChange: (filters: ReservationFilters) => void
}

export function ReservationsPage({ filters, onFiltersChange }: ReservationsPageProps) {
  const list = useQuery(reservationsQueryOptions(filters))
  const properties = useQuery(shortStayPropertiesQueryOptions).data?.items
  const propertyNames = Object.fromEntries(properties?.map((p) => [p.id, p.name]) ?? [])
  const filtered = Boolean(filters.status || filters.propertyId)
  const data = list.data

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Reservas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data
              ? `${data.total} ${data.total === 1 ? 'reserva' : 'reservas'}${filtered ? ' com estes filtros' : ''}, da entrada mais recente para a mais antiga`
              : ' '}
          </p>
        </div>
        <Link
          to="/app/reservas/nova"
          search={filters.propertyId ? { propertyId: filters.propertyId } : {}}
          className={buttonVariants({ size: 'lg', className: 'h-10 px-5' })}
        >
          <Plus aria-hidden="true" />
          Nova reserva
        </Link>
      </header>

      <ReservationViewTabs />

      <div role="search" className="mt-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-52">
          <FilterSelect
            label="Situação"
            allLabel="Todas as situações"
            value={filters.status}
            options={RESERVATION_STATUS_LABEL}
            onChange={(status) => onFiltersChange({ ...filters, status, page: 1 })}
          />
        </div>
        <div className="w-full sm:w-64">
          <FilterSelect
            label="Imóvel"
            allLabel="Todos os imóveis"
            value={filters.propertyId}
            options={propertyNames}
            onChange={(propertyId) => onFiltersChange({ ...filters, propertyId, page: 1 })}
          />
        </div>
      </div>

      <section
        aria-label="Lista de reservas"
        aria-busy={list.isFetching}
        className={cn('mt-4 rounded-2xl border bg-card transition-opacity', list.isPlaceholderData && 'opacity-60')}
      >
        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b text-xs whitespace-nowrap text-muted-foreground">
                  <th scope="col" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">Hóspede</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Imóvel</th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">Estadia</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Noites</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Valor total</th>
                  <th scope="col" className="py-3 pr-5 pl-4 text-left font-medium sm:pr-6">Situação</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((reservation) => (
                  <tr key={reservation.id} className="border-b last:border-b-0 hover:bg-muted/50">
                    <th scope="row" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">
                      <Link
                        to="/app/reservas/$reservationId"
                        params={{ reservationId: reservation.id }}
                        className="rounded-sm hover:underline hover:underline-offset-4"
                      >
                        {reservation.guest.name}
                      </Link>
                    </th>
                    <td className="px-4 py-3">
                      <Link
                        to="/app/imoveis/$propertyId"
                        params={{ propertyId: reservation.propertyId }}
                        className="rounded-sm hover:underline hover:underline-offset-4"
                      >
                        {reservation.propertyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{stayPeriod(reservation)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{reservation.nights}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatMoney(reservation.totalAmountCents)}
                    </td>
                    <td className="py-3 pr-5 pl-4 sm:pr-6">
                      <ReservationStatusBadge status={reservation.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : data ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <p className="font-medium">{filtered ? 'Nenhuma reserva encontrada' : 'Nenhuma reserva cadastrada ainda'}</p>
            <p className="text-sm text-muted-foreground">
              {filtered ? 'Tire algum filtro para ver mais.' : 'As estadias dos imóveis de temporada aparecem aqui.'}
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
