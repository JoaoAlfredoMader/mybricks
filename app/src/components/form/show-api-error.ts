import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/lib/api/client'

interface ShowApiErrorOptions {
  /** Where the API's request paths land: `{ 'occupant.name': 'occupantName' }`. */
  fields: Readonly<Record<string, string>>
  /** The API answers in English; this says what a person can act on, in Portuguese. */
  translate: (message: string) => string
  /** For a failure that is not a validation error (no answer, a 500…). */
  fallback: (failure: unknown) => string
}

/** Puts each API validation error under its field; whatever has no field goes to the top of the form. */
export function showApiError<T extends FieldValues>(
  failure: unknown,
  setError: UseFormSetError<T>,
  { fields, translate, fallback }: ShowApiErrorOptions,
) {
  const unplaced: string[] = []
  if (failure instanceof ApiError && failure.fieldErrors.length > 0) {
    for (const { path, message } of failure.fieldErrors) {
      const field = fields[path]
      if (field) setError(field as Path<T>, { message: translate(message) }, { shouldFocus: true })
      else unplaced.push(translate(message))
    }
  } else {
    unplaced.push(fallback(failure))
  }
  if (unplaced.length > 0) setError('root', { message: unplaced.join(' ') })
}
