import { describe, expect, it } from 'vitest'
import { flowWindowRange, periodRange } from './period'

describe('flowWindowRange', () => {
  const today = new Date(2026, 10, 5) // 5 Nov 2026

  it('gives the first and last month of each window', () => {
    expect(flowWindowRange('last-12-months', today)).toEqual({ from: '2025-12', to: '2026-11' })
    expect(flowWindowRange('this-year', today)).toEqual({ from: '2026-01', to: '2026-12' })
    expect(flowWindowRange('last-year', today)).toEqual({ from: '2025-01', to: '2025-12' })
  })

  it('counts the twelve months back across the turn of the year', () => {
    expect(flowWindowRange('last-12-months', new Date(2026, 0, 20))).toEqual({ from: '2025-02', to: '2026-01' })
  })
})

describe('periodRange', () => {
  const today = new Date(2026, 10, 5) // 5 Nov 2026

  it('gives the first and last day of each preset', () => {
    expect(periodRange('this-month', today)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(periodRange('last-month', today)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(periodRange('this-year', today)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
    expect(periodRange('last-12-months', today)).toEqual({ from: '2025-12-01', to: '2026-11-30' })
  })

  it('crosses the turn of the year', () => {
    expect(periodRange('last-month', new Date(2026, 0, 15))).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(periodRange('this-month', new Date(2028, 1, 10))).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
})
