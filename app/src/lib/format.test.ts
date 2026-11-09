import { describe, expect, it } from 'vitest'
import {
  formatAnnualPercent,
  formatArea,
  formatBytes,
  formatCompactMoney,
  formatDate,
  formatDocument,
  formatMoney,
  formatNumericDate,
  formatPhone,
  formatRate,
  formatTimeUntil,
  formatWholeMoney,
} from './format'

// Intl separates the currency sign with a no-break space.
const plain = (value: string) => value.replace(/ /g, ' ')

describe('format', () => {
  it('turns cents into reais', () => {
    expect(plain(formatMoney(123456))).toBe('R$ 1.234,56')
    expect(plain(formatWholeMoney(68000000))).toBe('R$ 680.000')
    expect(plain(formatWholeMoney(-420000))).toBe('-R$ 4.200')
  })

  it('abbreviates headline amounts', () => {
    expect(plain(formatCompactMoney(657000000))).toBe('R$ 6,57 mi')
    expect(plain(formatCompactMoney(38470000))).toBe('R$ 384,7 mil')
    expect(plain(formatCompactMoney(32506000, { digits: 1 }))).toBe('R$ 325,1 mil')
  })

  it('shows fractions as percentages and a dash when there is no rate', () => {
    expect(formatRate(0.065038)).toBe('6,5%')
    expect(formatRate(-0.008077)).toBe('-0,8%')
    expect(formatRate(null)).toBe('—')
  })

  it('formats areas and yearly percentages', () => {
    expect(formatArea(2400)).toBe('2.400 m²')
    expect(formatArea(62.5)).toBe('62,5 m²')
    expect(formatAnnualPercent(9.5)).toBe('9,5% a.a.')
  })

  it('formats file sizes', () => {
    expect(formatBytes(860_000)).toBe('840 KB')
    expect(formatBytes(2_516_582)).toBe('2,4 MB')
    expect(formatBytes(10)).toBe('1 KB')
  })

  it('says how long until a moment', () => {
    const now = new Date('2026-11-04T12:00:00Z')
    expect(formatTimeUntil(new Date('2026-11-05T11:59:00Z'), now)).toBe('em 23 horas')
    expect(formatTimeUntil(new Date('2026-11-04T13:00:00Z'), now)).toBe('em 1 hora')
    expect(formatTimeUntil(new Date('2026-11-04T12:40:00Z'), now)).toBe('em 40 minutos')
    expect(formatTimeUntil(new Date('2026-11-04T11:00:00Z'), now)).toBe('em instantes')
  })

  it('formats CPF, CNPJ and phone numbers', () => {
    expect(formatDocument('12345678909')).toBe('123.456.789-09')
    expect(formatDocument('12345678000195')).toBe('12.345.678/0001-95')
    expect(formatDocument('X-1')).toBe('X-1')
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321')
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890')
    expect(formatPhone('+44 20 7946 0958')).toBe('+44 20 7946 0958')
  })

  it('reads a date as a calendar day', () => {
    expect(formatDate('2026-11-04')).toBe('4 de novembro de 2026')
    expect(formatNumericDate('2026-11-04')).toBe('04/11/2026')
    expect(formatNumericDate('2022-01-01')).toBe('01/01/2022')
  })
})
