import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockMatchMedia } from '@/test/match-media'
import { SCENE_STORAGE_KEY, useScene } from './use-scene'

describe('useScene', () => {
  it('starts in daylight when the system has no dark preference', () => {
    const { result } = renderHook(() => useScene())
    expect(result.current.scene).toBe('day')
  })

  it('starts at night when the system prefers dark', () => {
    mockMatchMedia((query) => query === '(prefers-color-scheme: dark)')
    const { result } = renderHook(() => useScene())
    expect(result.current.scene).toBe('night')
  })

  it('prefers the last choice over the system preference', () => {
    mockMatchMedia((query) => query === '(prefers-color-scheme: dark)')
    localStorage.setItem(SCENE_STORAGE_KEY, 'day')
    const { result } = renderHook(() => useScene())
    expect(result.current.scene).toBe('day')
  })

  it('ignores an unknown stored value', () => {
    localStorage.setItem(SCENE_STORAGE_KEY, 'dusk')
    const { result } = renderHook(() => useScene())
    expect(result.current.scene).toBe('day')
  })

  it('toggles and remembers the choice', () => {
    const { result } = renderHook(() => useScene())

    act(() => result.current.toggleScene())
    expect(result.current.scene).toBe('night')
    expect(localStorage.getItem(SCENE_STORAGE_KEY)).toBe('night')

    act(() => result.current.toggleScene())
    expect(result.current.scene).toBe('day')
    expect(localStorage.getItem(SCENE_STORAGE_KEY)).toBe('day')
  })
})
