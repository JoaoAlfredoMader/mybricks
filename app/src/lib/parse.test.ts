import { describe, expect, it } from 'vitest'
import {
  dateToInput,
  decimalToInput,
  maskDate,
  moneyToInput,
  parseDate,
  parseDecimal,
  parseInteger,
  parseMoney,
  todayInput,
} from './parse'

describe('parse', () => {
  it('reads decimals written the Brazilian way', () => {
    expect(parseDecimal('62,5')).toBe(62.5)
    expect(parseDecimal('1.200')).toBe(1200)
    expect(parseDecimal('2.400,75')).toBe(2400.75)
    expect(parseDecimal(' ')).toBeNull()
    expect(parseDecimal('12a')).toBeUndefined()
    expect(parseDecimal('1.20')).toBeUndefined()
  })

  it('reads whole numbers only', () => {
    expect(parseInteger('3')).toBe(3)
    expect(parseInteger('2,5')).toBeUndefined()
    expect(parseInteger('')).toBeNull()
  })

  it('reads money into integer cents', () => {
    expect(parseMoney('680.000')).toBe(68_000_000)
    expect(parseMoney('R$ 1.234,5')).toBe(123_450)
    expect(parseMoney('0,07')).toBe(7)
    expect(parseMoney('1,234')).toBeUndefined()
    expect(parseMoney('')).toBeNull()
  })

  it('reads a calendar day that exists', () => {
    expect(parseDate('14/05/2021')).toBe('2021-05-14')
    expect(parseDate('31/02/2021')).toBeUndefined()
    expect(parseDate('14/5/2021')).toBeUndefined()
    expect(parseDate('')).toBeNull()
  })

  it('adds the slashes while a date is typed', () => {
    expect(maskDate('14')).toBe('14')
    expect(maskDate('1405')).toBe('14/05')
    expect(maskDate('14052021')).toBe('14/05/2021')
    expect(maskDate('14/05/20219')).toBe('14/05/2021')
  })

  it('writes values back for editing', () => {
    expect(decimalToInput(62.5)).toBe('62,5')
    expect(decimalToInput(null)).toBe('')
    expect(moneyToInput(68_000_000)).toBe('680.000,00')
    expect(dateToInput('2021-05-14')).toBe('14/05/2021')
    expect(todayInput(new Date(2026, 10, 5, 23, 30))).toBe('05/11/2026')
  })
})
