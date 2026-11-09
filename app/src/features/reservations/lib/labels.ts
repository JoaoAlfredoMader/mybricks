import { formatNumericDate } from '@/lib/format'
import type { Reservation, ReservationStatus } from '../api/queries'

/** Each status with a dot colour; the label always goes with it. */
export const RESERVATION_STATUS: Record<ReservationStatus, { label: string; color: string }> = {
  confirmed: { label: 'Confirmada', color: 'var(--chart-3)' },
  cancelled: { label: 'Cancelada', color: 'var(--chart-2)' },
}

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  confirmed: 'Confirmadas',
  cancelled: 'Canceladas',
}

/** "10/12/2026 a 15/12/2026". */
export function stayPeriod({ checkIn, checkOut }: Pick<Reservation, 'checkIn' | 'checkOut'>): string {
  return `${formatNumericDate(checkIn)} a ${formatNumericDate(checkOut)}`
}

/** "1 noite", "5 noites". */
export function formatNights(nights: number): string {
  return `${nights} ${nights === 1 ? 'noite' : 'noites'}`
}
