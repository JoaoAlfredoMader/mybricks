import { describe, expect, it } from 'vitest'
import { HOME_AFTER_SIGN_IN, redirectTarget } from './redirect-target'

describe('redirectTarget', () => {
  it('keeps a path inside the app, with its query', () => {
    expect(redirectTarget('/app/properties?page=2')).toBe('/app/properties?page=2')
  })

  it.each([undefined, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'app'])(
    'falls back to the app home for %j',
    (value) => {
      expect(redirectTarget(value)).toBe(HOME_AFTER_SIGN_IN)
    },
  )

  it('never sends the visitor back to the login page', () => {
    expect(redirectTarget('/login?redirect=/app')).toBe(HOME_AFTER_SIGN_IN)
  })
})
