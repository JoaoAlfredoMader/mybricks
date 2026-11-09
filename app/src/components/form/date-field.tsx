import { Controller, type FieldValues, type Path, useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { maskDate } from '@/lib/parse'
import { Field } from './field'

/** A dd/mm/aaaa field that adds the slashes while typing; the form keeps the typed text. */
export function DateField<T extends FieldValues>({ name, label, hint }: { name: Path<T>; label: string; hint?: string }) {
  const { control, formState } = useFormContext<T>()
  const error = formState.errors[name]?.message as string | undefined
  return (
    <Field label={label} error={error} hint={hint}>
      {(controlProps) => (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Input
              {...controlProps}
              className="h-10"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              autoComplete="off"
              name={field.name}
              ref={field.ref}
              value={field.value as string}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(maskDate(event.target.value))}
            />
          )}
        />
      )}
    </Field>
  )
}
