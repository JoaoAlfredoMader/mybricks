import type { ReactNode } from 'react'

export interface DetailItem {
  label: string
  /** null or undefined shows a dash: the field exists but is not filled in. */
  value: ReactNode | null | undefined
}

/** A titled card with a list of label/value pairs. */
export function DetailCard({ title, items, children }: { title: string; items?: DetailItem[]; children?: ReactNode }) {
  const id = `detail-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={id} className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 id={id} className="font-semibold">
        {title}
      </h2>
      {items && (
        <dl className="mt-4 grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
          {items.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="min-w-0 break-words">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  )
}
