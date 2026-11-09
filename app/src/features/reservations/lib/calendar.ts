/**
 * The dates behind the reservations calendar: a month of day columns, and where a stay's bar goes in
 * it. Everything is in whole days on the calendar (YYYY-MM-DD, no time zone), like the API's dates.
 */

const DAY = 86_400_000
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const pad = (value: number) => String(value).padStart(2, '0')

/** "2026-11" → the month after or before, `delta` months away. */
export function shiftMonth(month: string, delta: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + delta
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

/** The month a date falls in: "2026-11-05" → "2026-11". */
export function monthOf(day: string): string {
  return day.slice(0, 7)
}

/** The first day of the month, the first day of the next (what the API's `to` takes) and how many days it has. */
export function monthBounds(month: string): { first: string; next: string; days: number } {
  const first = `${month}-01`
  const next = `${shiftMonth(month, 1)}-01`
  return { first, next, days: Math.round((utc(next) - utc(first)) / DAY) }
}

/** The days of a month, in order, each with its weekday (0 is Sunday). */
export function monthDays(month: string): { day: string; number: number; weekday: number }[] {
  const { first, days } = monthBounds(month)
  return Array.from({ length: days }, (_, index) => ({
    day: `${month}-${pad(index + 1)}`,
    number: index + 1,
    weekday: new Date(utc(first) + index * DAY).getUTCDay(),
  }))
}

/** "novembro de 2026". */
export function monthTitle(month: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(utc(`${month}-01`)))
}

export interface StayBar {
  /** Where the bar starts and ends, in days from the left edge of the month; the middle of a day is .5. */
  start: number
  end: number
  /** The stay began before the month, or goes on after it: the bar leaves the edge open. */
  continuesBefore: boolean
  continuesAfter: boolean
}

/**
 * The bar of a stay in a month. A guest arrives during the check-in day and leaves during the check-out
 * day, so the bar runs from the middle of one to the middle of the other: two stays that meet on a
 * turnover day touch in the middle of it, and the check-out day is visibly still free for the next.
 */
export function stayBar(stay: { checkIn: string; checkOut: string }, month: string): StayBar {
  const { first, days } = monthBounds(month)
  const from = (utc(stay.checkIn) - utc(first)) / DAY + 0.5
  const to = (utc(stay.checkOut) - utc(first)) / DAY + 0.5
  return {
    start: Math.max(from, 0),
    end: Math.min(to, days),
    continuesBefore: from < 0,
    continuesAfter: to > days,
  }
}

/** The stays on one row, in order of arrival: the API sends the latest first. */
export function byArrival<T extends { checkIn: string }>(stays: readonly T[]): T[] {
  return [...stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn))
}
