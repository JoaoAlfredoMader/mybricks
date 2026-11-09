import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FilterSelectProps<T extends string> {
  label: string
  /** Shown when nothing is picked. */
  allLabel: string
  value: T | undefined
  /**
   * A label per value, or a list when the order matters: an object with numeric-looking keys
   * (ids) would come back sorted by key, not in the order given.
   */
  options: Record<T, string> | readonly { value: T; label: string }[]
  onChange: (value: T | undefined) => void
}

/** One filter dimension, in the app's own pill-and-card menu rather than the browser's. */
export function FilterSelect<T extends string>({ label, allLabel, value, options, onChange }: FilterSelectProps<T>) {
  const entries = Array.isArray(options)
    ? options
    : (Object.entries(options) as [T, string][]).map(([key, text]) => ({ value: key, label: text }))
  const items: { value: T | null; label: string }[] = [{ value: null, label: allLabel }, ...entries]

  return (
    <Select<T | null> items={items} value={value ?? null} onValueChange={(next) => onChange(next ?? undefined)}>
      <SelectTrigger aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value ?? 'all'} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
