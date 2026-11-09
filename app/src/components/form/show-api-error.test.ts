import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { showApiError } from './show-api-error'

const options = {
  fields: { 'occupant.name': 'occupantName', endDate: 'endDate' },
  translate: (message: string) => `PT: ${message}`,
  fallback: () => 'Sem resposta.',
}

const validation = (details: unknown) => new ApiError(400, { code: 'VALIDATION_ERROR', message: 'Invalid request', details } as never)

describe('showApiError', () => {
  it('puts each validation error under its field, translated, and focuses it', () => {
    const setError = vi.fn()
    showApiError(
      validation([
        { path: 'occupant.name', message: 'Too short' },
        { path: 'endDate', message: 'End date must be after the start date' },
      ]),
      setError,
      options,
    )
    expect(setError).toHaveBeenCalledWith('occupantName', { message: 'PT: Too short' }, { shouldFocus: true })
    expect(setError).toHaveBeenCalledWith('endDate', { message: 'PT: End date must be after the start date' }, { shouldFocus: true })
    expect(setError).toHaveBeenCalledTimes(2)
  })

  it('sends what has no field to the top of the form, joined', () => {
    const setError = vi.fn()
    showApiError(
      validation([
        { path: 'somethingElse', message: 'One' },
        { path: 'endDate', message: 'Two' },
        { path: 'another', message: 'Three' },
      ]),
      setError,
      options,
    )
    expect(setError).toHaveBeenCalledWith('endDate', { message: 'PT: Two' }, { shouldFocus: true })
    expect(setError).toHaveBeenLastCalledWith('root', { message: 'PT: One PT: Three' })
  })

  it('uses the fallback when it was not a validation error: no answer, a 500, or no field errors', () => {
    for (const failure of [new TypeError('Failed to fetch'), new ApiError(500, { code: 'INTERNAL_ERROR', message: 'boom' } as never), validation({ not: 'a list' })]) {
      const setError = vi.fn()
      showApiError(failure, setError, options)
      expect(setError).toHaveBeenCalledOnce()
      expect(setError).toHaveBeenCalledWith('root', { message: 'Sem resposta.' })
    }
  })
})
