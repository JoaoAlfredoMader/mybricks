import createClient from 'openapi-fetch'
import type { components, paths } from './schema'

export type Schemas = components['schemas']
type ErrorBody = Schemas['ErrorResponse']['error']

/** An answer from the API that is not a success, in the shape every route uses. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorBody['code']
  readonly details: unknown

  constructor(status: number, body: ErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.details = body.details
  }

  /** Validation errors come as `[{ path, message }]`; anything else yields an empty list. */
  get fieldErrors(): { path: string; message: string }[] {
    if (!Array.isArray(this.details)) return []
    return this.details.filter(
      (item): item is { path: string; message: string } =>
        typeof item?.path === 'string' && typeof item?.message === 'string',
    )
  }
}

function isErrorResponse(value: unknown): value is Schemas['ErrorResponse'] {
  return typeof value === 'object' && value !== null && 'error' in value
}

/**
 * Typed client generated from the back-end OpenAPI document (`npm run api:types`).
 * Paths already start with /api; the session travels in the cookie.
 */
export const api = createClient<paths>({
  // Same origin as the page (Vite proxies /api in development).
  baseUrl: globalThis.location?.origin ?? '',
  credentials: 'include',
  // Looked up on every call, not captured once, so tests can stub fetch.
  fetch: (request) => globalThis.fetch(request),
})

/** The absolute URL of an API path, for what the browser loads itself (an <img>, a link). */
export function apiUrl(path: string): string {
  return `${globalThis.location?.origin ?? ''}${path}`
}

/** Returns the data of a successful answer or throws an ApiError. */
export async function unwrap<T>(request: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await request
  if (response.ok) return data as T
  const body = isErrorResponse(error)
    ? error.error
    : { code: 'INTERNAL_ERROR' as const, message: 'A API respondeu de um jeito inesperado.' }
  throw new ApiError(response.status, body)
}
