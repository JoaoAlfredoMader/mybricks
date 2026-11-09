import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { useState } from 'react'
import type { Property } from '@/features/properties/api/queries'
import { formatMoney } from '@/lib/format'
import { useElementWidth } from '@/lib/use-element-width'
import type { Reservation } from '../api/queries'
import { byArrival, monthDays, monthTitle, stayBar } from '../lib/calendar'
import { formatNights, stayPeriod } from '../lib/labels'

const LABEL_WIDTH = 160
const MIN_DAY_WIDTH = 30
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
/** Roughly how wide a name is at the bar's text size; a name is only written in a bar that can hold it. */
const CHARACTER_WIDTH = 6.8
const BAR_PADDING = 18

interface Hover {
  stay: Reservation
  left: number
  top: number
}

function stayDescription(stay: Reservation) {
  return `${stay.guest.name}, de ${stayPeriod(stay)}, ${formatNights(stay.nights)}`
}

/** The readout of a stay, beside its bar: it enhances the link, which carries the same words. */
function Readout({ hover }: { hover: Hover }) {
  const { stay } = hover
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-50 w-64 rounded-xl bg-popover p-3 text-popover-foreground shadow-lg shadow-slate-900/8 ring-1 ring-foreground/8"
      style={{ left: hover.left, top: hover.top }}
    >
      <p className="text-sm font-semibold">{stay.guest.name}</p>
      <p className="text-xs text-muted-foreground">{stay.propertyName}</p>
      <dl className="mt-2 grid gap-1 text-xs">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Estadia</dt>
          <dd className="tabular-nums">{stayPeriod(stay)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Noites</dt>
          <dd>{formatNights(stay.nights)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Valor total</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(stay.totalAmountCents)}</dd>
        </div>
        {stay.contractId && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Contrato</dt>
            <dd>Ligado</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

interface ReservationsCalendarProps {
  month: string
  /** The short-stay properties: one row each, in the order given. */
  properties: Property[]
  /** The confirmed stays that touch the month. */
  reservations: Reservation[]
  /** Today, as YYYY-MM-DD, to mark its column. */
  today: string
}

/**
 * A month on a timeline: a row per property, a column per day, and each stay a bar from the middle of
 * its check-in day to the middle of its check-out day. The month scrolls sideways under the property
 * names, which stay put; every bar is a link to its reservation.
 */
export function ReservationsCalendar({ month, properties, reservations, today }: ReservationsCalendarProps) {
  const [hover, setHover] = useState<Hover | null>(null)
  const { ref, width: boxWidth } = useElementWidth(1100)
  const days = monthDays(month)
  // The columns share the room there is (a pixel is left over, so a rounding never makes it scroll),
  // and no narrower than the least that reads; past that, it scrolls.
  const DAY_WIDTH = Math.max(MIN_DAY_WIDTH, (boxWidth - LABEL_WIDTH - 1) / days.length)
  const width = days.length * DAY_WIDTH
  const byProperty = new Map<string, Reservation[]>()
  for (const stay of reservations) byProperty.set(stay.propertyId, [...(byProperty.get(stay.propertyId) ?? []), stay])

  function show(stay: Reservation, element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    // Under the bar, kept inside the window.
    setHover({ stay, left: Math.min(Math.max(rect.left, 8), window.innerWidth - 264), top: rect.bottom + 6 })
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={`Calendário de ${monthTitle(month)}`}
      className="overflow-x-auto rounded-2xl border bg-card"
      onScroll={() => setHover(null)}
    >
      <div style={{ width: LABEL_WIDTH + width }} className="min-w-full">
        <div className="flex border-b text-xs text-muted-foreground">
          <div style={{ width: LABEL_WIDTH }} className="sticky left-0 z-20 flex shrink-0 items-end bg-card px-4 pb-2 font-medium">
            Imóvel
          </div>
          {days.map(({ day, number, weekday }) => (
            <div
              key={day}
              style={{ width: DAY_WIDTH }}
              className={cn('flex shrink-0 flex-col items-center gap-0.5 border-l py-2', (weekday === 0 || weekday === 6) && 'bg-muted/50')}
            >
              <span aria-hidden="true">{WEEKDAYS[weekday]}</span>
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full tabular-nums',
                  day === today && 'bg-primary font-semibold text-primary-foreground',
                )}
                aria-current={day === today ? 'date' : undefined}
              >
                {number}
              </span>
            </div>
          ))}
        </div>

        {properties.map((property) => {
          const stays = byArrival<Reservation>(byProperty.get(property.id) ?? [])
          return (
            <div key={property.id} role="group" aria-label={property.name} className="flex border-b last:border-b-0">
              <div
                style={{ width: LABEL_WIDTH }}
                className="sticky left-0 z-20 flex shrink-0 items-center bg-card px-4 text-sm font-medium"
              >
                <Link
                  to="/app/imoveis/$propertyId"
                  params={{ propertyId: property.id }}
                  className="rounded-sm hover:underline hover:underline-offset-4"
                >
                  {property.name}
                </Link>
              </div>
              <div className="relative flex h-14 shrink-0" style={{ width }}>
                {days.map(({ day, weekday }) => (
                  <div
                    key={day}
                    style={{ width: DAY_WIDTH }}
                    className={cn('h-full shrink-0 border-l', (weekday === 0 || weekday === 6) && 'bg-muted/50', day === today && 'bg-primary/5')}
                  />
                ))}
                {stays.map((stay) => {
                  const bar = stayBar(stay, month)
                  // A hairline of the card's colour on each side keeps neighbours apart on a turnover day.
                  const left = Math.round(bar.start * DAY_WIDTH) + 1
                  const barWidth = Math.round((bar.end - bar.start) * DAY_WIDTH) - 2
                  const fits = stay.guest.name.length * CHARACTER_WIDTH + BAR_PADDING <= barWidth
                  return (
                    <Link
                      key={stay.id}
                      to="/app/reservas/$reservationId"
                      params={{ reservationId: stay.id }}
                      aria-label={stayDescription(stay)}
                      className={cn(
                        'absolute top-4 flex h-6 items-center bg-chart-1 px-2 text-xs font-medium whitespace-nowrap text-white outline-none hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring/50',
                        bar.continuesBefore ? 'rounded-l-none' : 'rounded-l',
                        bar.continuesAfter ? 'rounded-r-none' : 'rounded-r',
                      )}
                      style={{ left, width: barWidth }}
                      onPointerEnter={(event) => show(stay, event.currentTarget)}
                      onPointerLeave={() => setHover(null)}
                      onFocus={(event) => show(stay, event.currentTarget)}
                      onBlur={() => setHover(null)}
                    >
                      {fits && stay.guest.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      {hover && <Readout hover={hover} />}
    </div>
  )
}
