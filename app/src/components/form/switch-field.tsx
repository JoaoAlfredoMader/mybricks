import { useId } from 'react'

interface SwitchFieldProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** An on/off choice that opens or closes a group of fields. A native checkbox with role=switch. */
export function SwitchField({ label, description, checked, onChange }: SwitchFieldProps) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer h-6 w-10 cursor-pointer appearance-none rounded-full bg-input transition-colors outline-none checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span
          className="pointer-events-none absolute top-1 left-1 size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"
          aria-hidden="true"
        />
      </span>
      <label htmlFor={id} className="cursor-pointer text-sm">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-muted-foreground">{description}</span>}
      </label>
    </div>
  )
}
