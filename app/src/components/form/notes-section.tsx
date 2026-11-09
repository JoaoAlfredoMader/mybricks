import { useFormContext } from 'react-hook-form'
import { Field } from './field'
import { FormSection } from './form-section'
import { Textarea } from './textarea'

/** A card with one free-text `notes` field, for any form whose values have `notes: string`. */
export function NotesSection() {
  const { register } = useFormContext<{ notes: string }>()
  return (
    <FormSection title="Observações">
      <Field label="Observações" className="sm:col-span-2">
        {(controlProps) => <Textarea {...controlProps} {...register('notes')} />}
      </Field>
    </FormSection>
  )
}
