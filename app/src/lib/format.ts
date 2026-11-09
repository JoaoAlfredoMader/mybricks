/**
 * Formatting for what the API sends: money in integer cents (BRL), rates as fractions
 * (0.065 = 6,5%) and calendar dates as YYYY-MM-DD. Nothing here recalculates a value.
 */

const EMPTY = '—'

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const wholeMoney = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const compactMoney = [1, 2].map(
  (digits) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: digits }),
) as [Intl.NumberFormat, Intl.NumberFormat]
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
const longDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' })

/** R$ 1.234,56 */
export function formatMoney(cents: number): string {
  return money.format(cents / 100)
}

/** R$ 1.235 — for tables where cents are noise. */
export function formatWholeMoney(cents: number): string {
  return wholeMoney.format(Math.round(cents / 100))
}

/** R$ 6,57 mi — for headline figures; `digits: 1` (R$ 325,1 mil) where space is tight. */
export function formatCompactMoney(cents: number, { digits = 2 }: { digits?: 1 | 2 } = {}): string {
  return compactMoney[digits - 1]!.format(cents / 100)
}

/** 6,5% from 0.065; a dash when the API could not compute the rate. */
export function formatRate(fraction: number | null): string {
  return fraction === null ? EMPTY : percent.format(fraction)
}

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** 2.400 m² */
export function formatArea(squareMeters: number): string {
  return `${number.format(squareMeters)} m²`
}

/** 9,5% a.a. from a rate the API sends in percent (financing), not as a fraction. */
export function formatAnnualPercent(percentPerYear: number): string {
  return `${number.format(percentPerYear)}% a.a.`
}

/** "em 23 horas", "em 40 minutos": how long until a moment, rounded down. */
export function formatTimeUntil(moment: Date, now: Date = new Date()): string {
  const minutes = Math.floor((moment.getTime() - now.getTime()) / 60_000)
  if (minutes < 1) return 'em instantes'
  if (minutes < 60) return minutes === 1 ? 'em 1 minuto' : `em ${minutes} minutos`
  const hours = Math.floor(minutes / 60)
  return hours === 1 ? 'em 1 hora' : `em ${hours} horas`
}

const megabytes = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** 840 KB, 2,4 MB */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${megabytes.format(bytes / (1024 * 1024))} MB`
}

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

/** "4 de nov. de 2026" for an ISO timestamp, in the viewer's time zone. */
export function formatTimestamp(iso: string): string {
  return shortDate.format(new Date(iso))
}

/** 4 de novembro de 2026, read as a calendar day (no time zone shift). */
export function formatDate(day: string): string {
  return longDate.format(new Date(`${day}T00:00:00Z`))
}

/** 12345678909 → 123.456.789-09 (CPF), 14 digits → 12.345.678/0001-95 (CNPJ); anything else as stored. */
export function formatDocument(document: string): string {
  const digits = document.replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  return document
}

/** 11987654321 → (11) 98765-4321, 1134567890 → (11) 3456-7890; anything else as stored. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
  return phone
}

const numericDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' })

/** 04/11/2026 — the calendar day for tables, where the long form is too wide. */
export function formatNumericDate(day: string): string {
  return numericDate.format(new Date(`${day}T00:00:00Z`))
}
