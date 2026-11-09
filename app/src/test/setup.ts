import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { mockMatchMedia } from './match-media'

// Route loaders and menus answer in a few ticks alone, but slower when every file runs at once.
configure({ asyncUtilTimeout: 3000 })

beforeEach(() => {
  // Every test starts with no media preference; a test can override it.
  mockMatchMedia()
  // The router restores scroll on navigation; jsdom does not implement it.
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})
