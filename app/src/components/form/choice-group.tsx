import { cn } from 'cn'
import { useId } from 'react'

interface ChoiceGroupProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  hint?: string
}

/** A small set of exclusive options as pills: native radios, so arrows and Tab just work. */
export function ChoiceGroup<T extends string>({ label, value, options, onChange, hint }: ChoiceGroupProps<T>) {
  const name = useId()
  return (
    <fieldset className="grid content-start gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1 rounded-full bg-muted p-1 sm:w-fit">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex h-8 flex-1 cursor-pointer items-center justify-center rounded-full px-4 text-sm whitespace-nowrap text-muted-foreground transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 sm:flex-none',
              option.value === value && 'bg-card font-medium text-foreground shadow-sm',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </fieldset>
  )
}
