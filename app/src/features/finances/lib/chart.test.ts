import { describe, expect, it } from 'vitest'
import { columnPath, monthAbbreviated, monthLong, niceScale, yFor } from './chart'

describe('niceScale', () => {
  it('ends on round numbers and always includes zero', () => {
    const scale = niceScale(0, 3_451_750)
    expect(scale).toMatchObject({ min: 0, max: 4_000_000, step: 1_000_000 })
    expect(scale.ticks).toEqual([0, 1_000_000, 2_000_000, 3_000_000, 4_000_000])
  })

  it('reaches below zero when the result is negative', () => {
    const scale = niceScale(-1_250_000, 3_000_000)
    expect(scale.min).toBeLessThan(0)
    expect(scale.ticks).toContain(0)
    expect(scale.max).toBeGreaterThanOrEqual(3_000_000)
    expect(scale.min).toBeLessThanOrEqual(-1_250_000)
  })

  it('keeps an empty chart from collapsing', () => {
    const scale = niceScale(0, 0)
    expect(scale.max).toBeGreaterThan(scale.min)
    expect(scale.ticks.length).toBeGreaterThanOrEqual(2)
  })
})

describe('yFor', () => {
  it('puts the max at the top and the min at the bottom', () => {
    const scale = niceScale(0, 4_000_000)
    expect(yFor(scale.max, scale, 10, 210)).toBe(10)
    expect(yFor(scale.min, scale, 10, 210)).toBe(210)
    expect(yFor(2_000_000, scale, 10, 210)).toBe(110)
  })
})

describe('columnPath', () => {
  it('rounds the top and keeps the foot square', () => {
    const path = columnPath(10, 100, 20, 50)
    expect(path.startsWith('M10,100 V54')).toBe(true)
    expect(path.endsWith('V100 Z')).toBe(true)
  })

  it('draws nothing for an empty column and shrinks the radius for a short one', () => {
    expect(columnPath(10, 100, 20, 0)).toBe('')
    expect(columnPath(10, 100, 20, 2)).toContain('V100')
  })
})

describe('month names', () => {
  it('writes a month in Portuguese', () => {
    expect(monthAbbreviated('2026-03')).toBe('mar/2026')
    expect(monthLong('2026-12')).toBe('dezembro de 2026')
  })
})
