import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { monthReservationsQueryOptions, shortStayPropertiesQueryOptions } from '@/features/reservations/api/queries'
import { ReservationCalendarPage } from '@/features/reservations/components/reservation-calendar-page'
import { monthOf } from '@/features/reservations/lib/calendar'

const pad = (value: number) => String(value).padStart(2, '0')
/** Today on the viewer's calendar, as YYYY-MM-DD. */
const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// A malformed month in the URL falls back to the current one instead of an error page.
const searchSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/app/reservas/calendario')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ month: search.month ?? monthOf(todayIso()) }),
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(monthReservationsQueryOptions(deps.month)),
      queryClient.ensureQueryData(shortStayPropertiesQueryOptions),
    ]),
  component: ReservationCalendarRoute,
})

export function ReservationCalendarRoute() {
  const { month } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const today = todayIso()
  const current = monthOf(today)

  return (
    <ReservationCalendarPage
      month={month ?? current}
      today={today}
      // The current month is the default: it needs no parameter in the URL.
      onMonthChange={(next) => navigate({ search: { month: next === current ? undefined : next }, replace: true })}
    />
  )
}
