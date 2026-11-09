/**
 * Reading what people type in pt-BR (1.234,56 · 14/05/2021) into what the API takes
 * (integer cents, numbers, YYYY-MM-DD), and back for editing. Each parser returns
 * `null` for an empty field and `undefined` for text it cannot read.
 */

function clean(text: string) {
  return text.trim().replace(/^R\$\s*/, '').replace(/\s/g, '')
}

/** "62,5" or "1.200" → 62.5 / 1200. */
export function parseDecimal(text: string): number | null | undefined {
  const value = clean(text)
  if (value === '') return null
  if (!/^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/.test(value)) return undefined
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

/** "12" → 12; anything with decimals is unreadable. */
export function parseInteger(text: string): number | null | undefined {
  const value = parseDecimal(text)
  if (value === null || value === undefined) return value
  return Number.isInteger(value) ? value : undefined
}

/** "R$ 1.234,5" → 123450 cents. More than two decimals is unreadable. */
export function parseMoney(text: string): number | null | undefined {
  const value = clean(text)
  if (value === '') return null
  if (/,\d{3,}$/.test(value)) return undefined
  const amount = parseDecimal(value)
  if (amount === null || amount === undefined) return amount
  return Math.round(amount * 100)
}

/** "14/05/2021" → "2021-05-14", only for a day that exists. */
export function parseDate(text: string): string | null | undefined {
  const value = text.trim()
  if (value === '') return null
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return undefined
  const [, day, month, year] = match
  const iso = `${year}-${month}-${day}`
  const date = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : undefined
}

/** Keeps digits and adds the slashes while a date is typed: "1405" → "14/05". */
export function maskDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/')
}

const decimalInput = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4, useGrouping: false })
const moneyInput = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 62.5 → "62,5" for an input; null → "". */
export function decimalToInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : decimalInput.format(value)
}

/** 123450 cents → "1.234,50" for an input; null → "". */
export function moneyToInput(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '' : moneyInput.format(cents / 100)
}

/** Today on the viewer's calendar, as typed in a date field: "05/11/2026". */
export function todayInput(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`
}

/** "2021-05-14" → "14/05/2021" for an input; null → "". */
export function dateToInput(day: string | null | undefined): string {
  if (!day) return ''
  const [year, month, date] = day.split('-')
  return `${date}/${month}/${year}`
}
