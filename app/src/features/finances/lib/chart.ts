/** Geometry for the cash-flow chart: kept apart from React so it can be tested on its own. */

/** Revenue and expense take the first two slots of the categorical palette; the result is drawn in ink. */
export const SERIES = {
  revenue: { label: 'Receitas', color: 'var(--chart-1)' },
  expense: { label: 'Despesas', color: 'var(--chart-2)' },
  net: { label: 'Resultado', color: 'var(--foreground)' },
} as const

export interface Scale {
  min: number
  max: number
  step: number
  ticks: number[]
}

/** The smallest "nice" step (1, 2 or 5 times a power of ten) that fits `range` in `maxTicks` intervals. */
function niceStep(range: number, maxTicks: number): number {
  const rough = range / maxTicks
  const power = 10 ** Math.floor(Math.log10(rough))
  const fraction = rough / power
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return nice * power
}

/**
 * A y scale that always includes zero (the bars grow from it) and ends on round numbers.
 * Amounts are in cents; `minimumRange` keeps an all-zero chart from collapsing into one line.
 */
export function niceScale(low: number, high: number, { maxTicks = 5, minimumRange = 100_000 } = {}): Scale {
  const min = Math.min(low, 0)
  const max = Math.max(high, 0)
  const step = niceStep(Math.max(max - min, minimumRange), maxTicks)
  const scaledMin = Math.floor(min / step) * step
  const scaledMax = Math.max(Math.ceil(max / step) * step, scaledMin + step)
  const ticks: number[] = []
  for (let value = scaledMin; value <= scaledMax + step / 2; value += step) ticks.push(value)
  return { min: scaledMin, max: scaledMax, step, ticks }
}

/** Where `value` falls on a vertical axis from `top` (the scale's max) to `bottom` (its min). */
export function yFor(value: number, scale: Scale, top: number, bottom: number): number {
  return bottom - ((value - scale.min) / (scale.max - scale.min)) * (bottom - top)
}

/** A column that grows up from `baseline`, with the top corners rounded and the foot square. */
export function columnPath(x: number, baseline: number, width: number, height: number, radius = 4): string {
  if (height <= 0) return ''
  const r = Math.min(radius, width / 2, height)
  const top = baseline - height
  return [
    `M${x},${baseline}`,
    `V${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `H${x + width - r}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `V${baseline}`,
    'Z',
  ].join(' ')
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-03" → "mar". */
export function monthShort(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1]!
}

/** "2026-03" → "março de 2026". */
export function monthLong(month: string): string {
  return `${MONTHS_LONG[Number(month.slice(5, 7)) - 1]} de ${month.slice(0, 4)}`
}

/** "2026-03" → "mar/2026". */
export function monthAbbreviated(month: string): string {
  return `${monthShort(month)}/${month.slice(0, 4)}`
}
