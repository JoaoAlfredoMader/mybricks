import type { z } from 'zod'

/** Reports what is wrong with one field of a form, in Portuguese. */
export type Issue = (path: string, message: string) => void

/** Turns a Zod refinement context into an `Issue`, for schemas written as `z.custom().superRefine(...)`. */
export function issuer(context: z.RefinementCtx): Issue {
  return (path, message) => context.addIssue({ code: 'custom', path: [path], message })
}
