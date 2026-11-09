import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { ChevronLeft, ChevronRight, Info, Plus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { monthReservationsQueryOptions, shortStayPropertiesQueryOptions } from '../api/queries'
import { monthOf, monthTitle, shiftMonth } from '../lib/calendar'
import { ReservationViewTabs } from './reservation-view-tabs'
import { ReservationsCalendar } from './reservations-calendar'

interface ReservationCalendarPageProps {
  month: string
  onMonthChange: (month: string) => void
  /** Today, as YYYY-MM-DD. */
  today: string
}

export function ReservationCalendarPage({ month, onMonthChange, today }: ReservationCalendarPageProps) {
  const properties = useQuery(shortStayPropertiesQueryOptions).data?.items
  const stays = useQuery(monthReservationsQueryOptions(month))
  const data = stays.data
  const thisMonth = monthOf(today)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Reservas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} ${data.total === 1 ? 'estadia confirmada' : 'estadias confirmadas'} em ${monthTitle(month)}` : ' '}
          </p>
        </div>
        <Link to="/app/reservas/nova" className={buttonVariants({ size: 'lg', className: 'h-10 px-5' })}>
          <Plus aria-hidden="true" />
          Nova reserva
        </Link>
      </header>

      <ReservationViewTabs />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => onMonthChange(shiftMonth(month, -1))}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h2 aria-live="polite" className="min-w-44 text-center font-semibold first-letter:uppercase">
          {monthTitle(month)}
        </h2>
        <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => onMonthChange(shiftMonth(month, 1))}>
          <ChevronRight aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="lg" className="h-10 px-4" disabled={month === thisMonth} onClick={() => onMonthChange(thisMonth)}>
          Hoje
        </Button>
      </div>

      <div aria-busy={stays.isFetching} className={cn('mt-4 transition-opacity', stays.isPlaceholderData && 'opacity-60')}>
        {properties && properties.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-14 text-center">
            <p className="font-medium">Nenhum imóvel de temporada ainda</p>
            <p className="text-sm text-muted-foreground">O calendário mostra os imóveis com uso "Temporada" e as estadias de cada um.</p>
            <Link to="/app/imoveis/novo" className={buttonVariants({ variant: 'outline' })}>
              Cadastrar um imóvel
            </Link>
          </div>
        ) : properties && data ? (
          <>
            <ReservationsCalendar month={month} properties={properties} reservations={data.items} today={today} />
            {data.total > data.items.length && (
              <p role="status" className="mt-3 flex items-start gap-2 rounded-2xl bg-pastel-yellow px-4 py-3 text-sm">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Este mês tem {data.total} estadias e o calendário mostra {data.items.length}. Use a lista, com os filtros, para ver as outras.
              </p>
            )}
            {data.items.length === 0 && (
              <p className="mt-3 text-center text-sm text-muted-foreground">Nenhuma estadia confirmada em {monthTitle(month)}.</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              A barra vai do meio do dia da entrada ao meio do dia da saída: o dia da saída fica livre para a próxima estadia. Estadias
              canceladas não aparecem.
            </p>
          </>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">Carregando o calendário…</p>
        )}
      </div>
    </main>
  )
}
