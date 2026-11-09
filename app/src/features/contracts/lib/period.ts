import { formatNumericDate } from '@/lib/format'
import type { Contract } from '../api/queries'

/** "14/05/2024 a 13/05/2027", or "Desde 14/05/2024" for an open-ended contract. */
export function contractPeriod({ startDate, endDate }: Pick<Contract, 'startDate' | 'endDate'>): string {
  return endDate
    ? `${formatNumericDate(startDate)} a ${formatNumericDate(endDate)}`
    : `Desde ${formatNumericDate(startDate)}`
}
