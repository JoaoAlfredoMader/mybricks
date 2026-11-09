import { cn } from 'cn'
import type { ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

interface AffixInputProps extends ComponentProps<'input'> {
  /** Text before the value, such as "R$". */
  prefix?: string
  /** Text after the value, such as "%" or "m²". */
  suffix?: string
}

/** A text input with a unit inside the pill; the unit is not part of the value. */
export function AffixInput({ prefix, suffix, className, ...props }: AffixInputProps) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-muted-foreground" aria-hidden="true">
          {prefix}
        </span>
      )}
      <Input className={cn('h-10', prefix && 'pl-11', suffix && 'pr-12', className)} {...props} />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground" aria-hidden="true">
          {suffix}
        </span>
      )}
    </div>
  )
}
