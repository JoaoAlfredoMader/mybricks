import { formatMoney, formatNumericDate } from '@/lib/format'
import type { Transaction, TransactionType } from '../api/queries'

/**
 * Revenue and expense keep the first two slots of the categorical palette, always next to their
 * label, so a future chart of the two reads the same way.
 */
export const TRANSACTION_TYPE: Record<TransactionType, { label: string; color: string }> = {
  revenue: { label: 'Receita', color: 'var(--chart-1)' },
  expense: { label: 'Despesa', color: 'var(--chart-2)' },
}

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  revenue: 'Receitas',
  expense: 'Despesas',
}

export const RECURRING_LABEL: Record<'true' | 'false', string> = {
  true: 'Recorrentes',
  false: 'Avulsos',
}

/** "Mensal até 31/12/2027", "Mensal, sem data para acabar" or "Avulso". */
export function recurrence({ isRecurring, recurrenceEndsOn }: Pick<Transaction, 'isRecurring' | 'recurrenceEndsOn'>): string {
  if (!isRecurring) return 'Avulso'
  return recurrenceEndsOn ? `Mensal até ${formatNumericDate(recurrenceEndsOn)}` : 'Mensal, sem data para acabar'
}

/** "+ R$ 1.000,00" for revenue, "− R$ 500,00" for expense: the API keeps every amount positive. */
export function signedAmount({ type, amountCents }: Pick<Transaction, 'type' | 'amountCents'>): string {
  return `${type === 'revenue' ? '+' : '−'} ${formatMoney(amountCents)}`
}
