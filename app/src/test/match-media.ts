import { vi } from 'vitest'

/** jsdom has no matchMedia: answer each media query with `matches(query)`. */
export function mockMatchMedia(matches: (query: string) => boolean = () => false) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: matches(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}
