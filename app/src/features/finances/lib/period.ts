/** The date presets of the list filter; the URL keeps the key, the request gets the dates. */
export type PeriodKey = 'this-month' | 'last-month' | 'this-year' | 'last-12-months'

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  'this-month': 'Este mês',
  'last-month': 'Mês passado',
  'this-year': 'Este ano',
  'last-12-months': 'Últimos 12 meses',
}

/** The window of the cash-flow chart, in whole months. */
export type FlowWindow = 'last-12-months' | 'this-year' | 'last-year'

export const FLOW_WINDOW_LABEL: Record<FlowWindow, string> = {
  'last-12-months': 'Últimos 12 meses',
  'this-year': 'Este ano',
  'last-year': 'Ano passado',
}

const pad = (value: number) => String(value).padStart(2, '0')

/** The first and last month (YYYY-MM, both included) of a chart window, on the viewer's calendar. */
export function flowWindowRange(key: FlowWindow, today: Date = new Date()): { from: string; to: string } {
  const year = today.getFullYear()
  const month = (value: number) => {
    const date = new Date(year, value, 1)
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
  }
  switch (key) {
    case 'last-12-months':
      return { from: month(today.getMonth() - 11), to: month(today.getMonth()) }
    case 'this-year':
      return { from: `${year}-01`, to: `${year}-12` }
    case 'last-year':
      return { from: `${year - 1}-01`, to: `${year - 1}-12` }
  }
}
const iso = (year: number, month: number, day: number) => {
  // Date normalizes month overflow (month 0 of next year, day 0 = last day of the previous month).
  const date = new Date(year, month, day)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The first and last day (YYYY-MM-DD, both included) of a preset, on the viewer's calendar. */
export function periodRange(key: PeriodKey, today: Date = new Date()): { from: string; to: string } {
  const year = today.getFullYear()
  const month = today.getMonth()
  switch (key) {
    case 'this-month':
      return { from: iso(year, month, 1), to: iso(year, month + 1, 0) }
    case 'last-month':
      return { from: iso(year, month - 1, 1), to: iso(year, month, 0) }
    case 'this-year':
      return { from: iso(year, 0, 1), to: iso(year, 11, 31) }
    case 'last-12-months':
      return { from: iso(year, month - 11, 1), to: iso(year, month + 1, 0) }
  }
}
