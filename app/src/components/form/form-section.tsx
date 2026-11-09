import type { ReactNode } from 'react'

/** One card of a long form, with its fields on a two-column grid from `sm` up. */
export function FormSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const id = `form-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={id} className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}
