import { describe, expect, it } from 'vitest'
import { byArrival, monthBounds, monthDays, monthOf, monthTitle, shiftMonth, stayBar } from './calendar'

describe('months', () => {
  it('moves between months, across the turn of the year', () => {
    expect(shiftMonth('2026-11', 1)).toBe('2026-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-03', -14)).toBe('2025-01')
  })

  it('knows where a month starts and ends, leap years included', () => {
    expect(monthBounds('2026-11')).toEqual({ first: '2026-11-01', next: '2026-12-01', days: 30 })
    expect(monthBounds('2026-12')).toEqual({ first: '2026-12-01', next: '2027-01-01', days: 31 })
    expect(monthBounds('2028-02').days).toBe(29)
    expect(monthBounds('2026-02').days).toBe(28)
  })

  it('lists the days with their weekdays', () => {
    const days = monthDays('2026-11')
    expect(days).toHaveLength(30)
    expect(days[0]).toEqual({ day: '2026-11-01', number: 1, weekday: 0 }) // 1 Nov 2026 is a Sunday
    expect(days[4]).toMatchObject({ number: 5, weekday: 4 })
    expect(days.at(-1)).toMatchObject({ day: '2026-11-30', weekday: 1 })
  })

  it('names a month in Portuguese and reads the month of a day', () => {
    expect(monthTitle('2026-11')).toBe('novembro de 2026')
    expect(monthTitle('2027-03')).toBe('março de 2027')
    expect(monthOf('2026-11-05')).toBe('2026-11')
  })
})

describe('stayBar', () => {
  it('runs from the middle of the check-in day to the middle of the check-out day', () => {
    expect(stayBar({ checkIn: '2026-11-22', checkOut: '2026-11-27' }, '2026-11')).toEqual({
      start: 21.5,
      end: 26.5,
      continuesBefore: false,
      continuesAfter: false,
    })
  })

  it('makes two stays that meet on a turnover day touch in the middle of it', () => {
    const first = stayBar({ checkIn: '2026-11-10', checkOut: '2026-11-15' }, '2026-11')
    const second = stayBar({ checkIn: '2026-11-15', checkOut: '2026-11-18' }, '2026-11')
    expect(first.end).toBe(second.start)
  })

  it('leaves the edge open for a stay that began before the month or goes on after it', () => {
    expect(stayBar({ checkIn: '2026-10-28', checkOut: '2026-11-03' }, '2026-11')).toEqual({
      start: 0,
      end: 2.5,
      continuesBefore: true,
      continuesAfter: false,
    })
    expect(stayBar({ checkIn: '2026-11-28', checkOut: '2026-12-04' }, '2026-11')).toEqual({
      start: 27.5,
      end: 30,
      continuesBefore: false,
      continuesAfter: true,
    })
  })

  it('counts a stay over the turn of the year', () => {
    expect(stayBar({ checkIn: '2026-12-30', checkOut: '2027-01-03' }, '2027-01')).toMatchObject({ start: 0, end: 2.5, continuesBefore: true })
  })
})

describe('byArrival', () => {
  it('puts the earliest arrival first without touching the original list', () => {
    const stays = [{ checkIn: '2026-11-20' }, { checkIn: '2026-11-02' }, { checkIn: '2026-11-11' }]
    expect(byArrival(stays).map((s) => s.checkIn)).toEqual(['2026-11-02', '2026-11-11', '2026-11-20'])
    expect(stays[0]!.checkIn).toBe('2026-11-20')
  })
})
