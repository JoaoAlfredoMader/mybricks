import { notFound } from '@tanstack/react-router'
import { ApiError } from '@/lib/api/client'

/**
 * Waits for a record's data. Another organization's record, a member's view of
 * someone else's, or an id that is not a UUID all answer as "not found".
 */
export async function loadOrNotFound(requests: Promise<unknown>[]): Promise<void> {
  try {
    await Promise.all(requests)
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.code === 'VALIDATION_ERROR')) throw notFound()
    throw error
  }
}
