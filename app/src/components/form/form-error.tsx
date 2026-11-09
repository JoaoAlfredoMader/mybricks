import { CircleAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'

/** What went wrong with the whole form (not one field), read out and scrolled into view as soon as it shows up. */
export function FormError({ message }: { message: string | undefined }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    // The submit button is at the bottom of a long form; the reason is at the top.
    if (message) ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [message])

  if (!message) return null
  return (
    <p ref={ref} role="alert" className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}
