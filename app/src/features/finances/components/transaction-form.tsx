import { zodResolver } from '@hookform/resolvers/zod'
import type { LinkProps } from '@tanstack/react-router'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { AffixInput } from '@/components/form/affix-input'
import { ChoiceGroup } from '@/components/form/choice-group'
import { DateField } from '@/components/form/date-field'
import { Field } from '@/components/form/field'
import { FormError } from '@/components/form/form-error'
import { FormFooter } from '@/components/form/form-footer'
import { FormSection } from '@/components/form/form-section'
import { OptionSelect } from '@/components/form/option-select'
import { showApiError } from '@/components/form/show-api-error'
import { SwitchField } from '@/components/form/switch-field'
import { Input } from '@/components/ui/input'
import type { Property } from '@/features/properties/api/queries'
import type { TransactionCategory, TransactionType } from '../api/queries'
import { TRANSACTION_TYPE } from '../lib/labels'
import {
  apiMessageInPortuguese,
  MAX_DESCRIPTION,
  REQUEST_PATH_TO_FIELD,
  transactionErrorMessage,
  type TransactionFormValues,
  transactionFormSchema,
} from '../lib/transaction-form'

const TYPE_OPTIONS = (Object.keys(TRANSACTION_TYPE) as TransactionType[]).map((type) => ({
  value: type,
  label: TRANSACTION_TYPE[type].label,
}))

const FORM_ERRORS = { fields: REQUEST_PATH_TO_FIELD, translate: apiMessageInPortuguese, fallback: transactionErrorMessage }

interface TransactionFormProps {
  initialValues: TransactionFormValues
  categories: TransactionCategory[]
  /** The properties to choose from; when editing, the property is fixed and named by `propertyName` instead. */
  properties?: Property[]
  propertyName?: string
  submitLabel: string
  cancel: LinkProps
  onSubmit: (values: TransactionFormValues) => Promise<unknown>
}

export function TransactionForm({
  initialValues,
  categories,
  properties,
  propertyName,
  submitLabel,
  cancel,
  onSubmit,
}: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({ resolver: zodResolver(transactionFormSchema), defaultValues: initialValues })
  const { register, control, setValue, getValues, setError, handleSubmit, formState } = form
  const { errors, isSubmitting } = formState
  const [type, isRecurring] = useWatch({ control, name: ['type', 'isRecurring'] })
  const categoryOptions = categories
    .filter((category) => category.transactionType === type)
    .map((category) => ({ value: String(category.id), label: category.name }))

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (failure) {
      showApiError(failure, setError, FORM_ERRORS)
    }
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormError message={errors.root?.message} />

        <FormSection title="Lançamento">
          {properties ? (
            <Field label="Imóvel" error={errors.propertyId?.message} className="sm:col-span-2">
              {(controlProps) => (
                <Controller
                  control={control}
                  name="propertyId"
                  render={({ field }) => (
                    <OptionSelect
                      control={controlProps}
                      value={field.value}
                      options={properties.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder="Escolha o imóvel"
                      onChange={field.onChange}
                    />
                  )}
                />
              )}
            </Field>
          ) : (
            <div className="grid gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Imóvel</span>
              <span>{propertyName}</span>
            </div>
          )}

          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <ChoiceGroup
                  label="Tipo"
                  value={field.value}
                  options={TYPE_OPTIONS}
                  hint="Decide quais categorias aparecem abaixo."
                  onChange={(next) => {
                    field.onChange(next)
                    // A category belongs to one type.
                    const category = categories.find((c) => String(c.id) === getValues('categoryId'))
                    if (category && category.transactionType !== next) setValue('categoryId', '')
                  }}
                />
              )}
            />
          </div>

          <Field label="Categoria" error={errors.categoryId?.message}>
            {(controlProps) => (
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <OptionSelect
                    control={controlProps}
                    value={field.value}
                    options={categoryOptions}
                    placeholder="Escolha a categoria"
                    onChange={field.onChange}
                  />
                )}
              />
            )}
          </Field>
          <Field label="Valor" error={errors.amount?.message}>
            {(controlProps) => (
              <AffixInput {...controlProps} prefix="R$" inputMode="decimal" autoComplete="off" placeholder="0,00" {...register('amount')} />
            )}
          </Field>
          <DateField<TransactionFormValues>
            name="occurredOn"
            label={isRecurring ? 'Primeira ocorrência' : 'Data'}
          />
          <Field label="Descrição" error={errors.description?.message} hint="Opcional.">
            {(controlProps) => (
              <Input {...controlProps} className="h-10" maxLength={MAX_DESCRIPTION} autoComplete="off" {...register('description')} />
            )}
          </Field>
        </FormSection>

        <FormSection title="Recorrência">
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="isRecurring"
              render={({ field }) => (
                <SwitchField
                  label="Repete todo mês"
                  description="Um lançamento igual em cada mês, a partir da data acima."
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          {isRecurring && (
            <DateField<TransactionFormValues>
              name="recurrenceEndsOn"
              label="Repete até"
              hint="O mês desta data é o último. Em branco, não tem data para acabar."
            />
          )}
        </FormSection>

        <FormFooter cancel={cancel} submitLabel={submitLabel} submitting={isSubmitting} />
      </form>
    </FormProvider>
  )
}
