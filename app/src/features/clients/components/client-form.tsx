import { zodResolver } from '@hookform/resolvers/zod'
import type { LinkProps } from '@tanstack/react-router'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { ChoiceGroup } from '@/components/form/choice-group'
import { Field } from '@/components/form/field'
import { FormError } from '@/components/form/form-error'
import { FormFooter } from '@/components/form/form-footer'
import { FormSection } from '@/components/form/form-section'
import { showApiError } from '@/components/form/show-api-error'
import { Input } from '@/components/ui/input'
import type { CreateClientRequest } from '../api/queries'
import {
  apiMessageInPortuguese,
  CLIENT_FIELDS,
  clientErrorMessage,
  type ClientFormValues,
  clientFormSchema,
  toClientRequest,
} from '../lib/client-form'
import { DOCUMENT_LABEL, PERSON_TYPE_LABEL } from '../lib/labels'

const PERSON_TYPE_OPTIONS = (Object.entries(PERSON_TYPE_LABEL) as [ClientFormValues['personType'], string][]).map(
  ([value, label]) => ({ value, label }),
)

const FORM_ERRORS = { fields: CLIENT_FIELDS, translate: apiMessageInPortuguese, fallback: clientErrorMessage }

interface ClientFormProps {
  initialValues: ClientFormValues
  submitLabel: string
  /** Where "Cancelar" goes. */
  cancel: LinkProps
  onSubmit: (request: CreateClientRequest) => Promise<unknown>
}

/** Creating and editing a client: a name, the kind of person, and how to reach them. */
export function ClientForm({ initialValues, submitLabel, cancel, onSubmit }: ClientFormProps) {
  const form = useForm<ClientFormValues>({ resolver: zodResolver(clientFormSchema), defaultValues: initialValues })
  const { register, control, setError, handleSubmit, formState } = form
  const { errors, isSubmitting } = formState
  const personType = useWatch({ control, name: 'personType' })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toClientRequest(values))
    } catch (failure) {
      showApiError(failure, setError, FORM_ERRORS)
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <FormError message={errors.root?.message} />

      <FormSection title="Dados">
        <Field label="Nome" error={errors.name?.message} className="sm:col-span-2">
          {(controlProps) => <Input {...controlProps} className="h-10" autoComplete="off" {...register('name')} />}
        </Field>
        <div className="sm:col-span-2">
          <Controller
            control={control}
            name="personType"
            render={({ field }) => (
              <ChoiceGroup
                label="Tipo de pessoa"
                value={field.value}
                onChange={field.onChange}
                options={PERSON_TYPE_OPTIONS}
                hint="Pessoa física se identifica por CPF; pessoa jurídica, por CNPJ."
              />
            )}
          />
        </div>
        <Field label={DOCUMENT_LABEL[personType]} error={errors.document?.message} hint="Opcional. Pode digitar com ou sem pontos.">
          {(controlProps) => <Input {...controlProps} className="h-10" inputMode="numeric" autoComplete="off" {...register('document')} />}
        </Field>
        <Field label="WhatsApp" error={errors.whatsapp?.message} hint="Opcional, com DDD.">
          {(controlProps) => <Input {...controlProps} className="h-10" inputMode="tel" autoComplete="off" {...register('whatsapp')} />}
        </Field>
        <Field label="E-mail" error={errors.email?.message} hint="Opcional." className="sm:col-span-2">
          {(controlProps) => <Input {...controlProps} className="h-10" inputMode="email" autoComplete="off" {...register('email')} />}
        </Field>
      </FormSection>

      <FormFooter cancel={cancel} submitLabel={submitLabel} submitting={isSubmitting} />
    </form>
  )
}
