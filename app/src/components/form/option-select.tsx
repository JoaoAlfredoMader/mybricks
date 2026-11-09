import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ControlProps } from './field'

interface OptionSelectProps<T extends string> {
  control: ControlProps
  value: T | ''
  options: { value: T; label: string }[]
  /** Offered first, for "not informed"; without it a choice is required. */
  emptyLabel?: string
  placeholder?: string
  disabled?: boolean
  onChange: (value: T | '') => void
}

/** A form select in the app's menu style; '' means nothing chosen. */
export function OptionSelect<T extends string>({
  control,
  value,
  options,
  emptyLabel,
  placeholder = 'Escolha',
  disabled,
  onChange,
}: OptionSelectProps<T>) {
  const items = [
    ...(emptyLabel ? [{ value: null, label: emptyLabel }] : []),
    ...options.map((option) => ({ value: option.value as T | null, label: option.label })),
  ]

  return (
    <Select<T | null>
      items={items}
      value={value === '' ? null : value}
      onValueChange={(next) => onChange(next ?? '')}
      disabled={disabled ?? false}
    >
      <SelectTrigger {...control} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value ?? 'none'} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
