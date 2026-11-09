import { isNotFound } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { loadOrNotFound } from './load-or-not-found'

const fail = (status: number, code: string) => Promise.reject(new ApiError(status, { code, message: 'x' } as never))

/** What `loadOrNotFound` throws, or `undefined` when it does not. */
async function thrown(requests: Promise<unknown>[]) {
  try {
    await loadOrNotFound(requests)
  } catch (error) {
    return error
  }
  return undefined
}

describe('loadOrNotFound', () => {
  it('waits for every request and returns nothing when they all work', async () => {
    await expect(loadOrNotFound([Promise.resolve(1), Promise.resolve(2)])).resolves.toBeUndefined()
  })

  it('turns a 404 into "not found": a record of another organization, or of someone else', async () => {
    expect(isNotFound(await thrown([Promise.resolve(1), fail(404, 'NOT_FOUND')]))).toBe(true)
  })

  it('turns a validation error into "not found": an id that is not a UUID', async () => {
    expect(isNotFound(await thrown([fail(400, 'VALIDATION_ERROR')]))).toBe(true)
  })

  it('lets any other failure through as it came', async () => {
    const server = await thrown([fail(500, 'INTERNAL_ERROR')])
    expect(isNotFound(server)).toBe(false)
    expect(server).toBeInstanceOf(ApiError)
    const offline = new TypeError('Failed to fetch')
    expect(await thrown([Promise.reject(offline)])).toBe(offline)
  })
})
