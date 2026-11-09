import { Controller, useFormContext } from 'react-hook-form'
import { ChoiceGroup } from '@/components/form/choice-group'
import { Field } from '@/components/form/field'
import { FormSection } from '@/components/form/form-section'
import { Input } from '@/components/ui/input'
import type { OccupantValues } from '../lib/occupant-form'
import { OccupantCombobox } from './occupant-combobox'

type TextField = 'occupantName' | 'occupantDocument' | 'occupantEmail' | 'occupantPhone'

interface OccupantFieldsProps {
  /** The card's title: "Ocupante", "Hóspede"… */
  title: string
  description: string
}

/** Pick a person on file or describe a new one. Lives in a form whose values include `OccupantValues`. */
export function OccupantFields({ title, description }: OccupantFieldsProps) {
  const { register, control, watch, formState } = useFormContext<OccupantValues>()
  const { errors } = formState
  const mode = watch('occupantMode')

  const text = (
    name: TextField,
    label: string,
    extra: { hint?: string; inputMode?: 'email' | 'tel' | 'numeric'; autoComplete?: string } = {},
  ) => (
    <Field label={label} error={errors[name]?.message} hint={extra.hint}>
      {(controlProps) => (
        <Input
          {...controlProps}
          className="h-10"
          inputMode={extra.inputMode}
          autoComplete={extra.autoComplete ?? 'off'}
          {...register(name)}
        />
      )}
    </Field>
  )

  return (
    <FormSection title={title} description={description}>
      <div className="sm:col-span-2">
        <Controller
          control={control}
          name="occupantMode"
          render={({ field }) => (
            <ChoiceGroup
              label="Quem é"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'new', label: 'Novo' },
                { value: 'existing', label: 'Já cadastrado' },
              ]}
              hint={
                field.value === 'new'
                  ? 'Se o CPF ou CNPJ já estiver cadastrado, o cadastro existente é usado.'
                  : 'Inquilinos e hóspedes de contratos e reservas anteriores.'
              }
            />
          )}
        />
      </div>
      {mode === 'existing' ? (
        <Field label={title} error={errors.occupant?.message} className="sm:col-span-2">
          {(controlProps) => (
            <Controller
              control={control}
              name="occupant"
              render={({ field }) => <OccupantCombobox control={controlProps} value={field.value} onChange={field.onChange} />}
            />
          )}
        </Field>
      ) : (
        <>
          <div className="sm:col-span-2">{text('occupantName', 'Nome', { autoComplete: 'name' })}</div>
          {text('occupantDocument', 'CPF ou CNPJ', { inputMode: 'numeric', hint: 'Opcional. Pode digitar com ou sem pontos.' })}
          {text('occupantPhone', 'Telefone', { inputMode: 'tel', hint: 'Opcional, com DDD.' })}
          <div className="sm:col-span-2">{text('occupantEmail', 'E-mail', { inputMode: 'email', hint: 'Opcional.' })}</div>
        </>
      )}
    </FormSection>
  )
}
