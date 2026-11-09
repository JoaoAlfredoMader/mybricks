import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import type { LinkProps } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { Controller, FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import { AffixInput } from '@/components/form/affix-input'
import { DateField } from '@/components/form/date-field'
import { Field } from '@/components/form/field'
import { FormError } from '@/components/form/form-error'
import { FormFooter } from '@/components/form/form-footer'
import { FormSection } from '@/components/form/form-section'
import { NotesSection } from '@/components/form/notes-section'
import { OptionSelect } from '@/components/form/option-select'
import { showApiError } from '@/components/form/show-api-error'
import { OccupantFields } from '@/features/occupants/components/occupant-fields'
import type { Property } from '@/features/properties/api/queries'
import { formatNumericDate } from '@/lib/format'
import { activeContractQueryOptions, type Contract, type CreateContractRequest, type UpdateContractRequest } from '../api/queries'
import {
  apiMessageInPortuguese,
  contractErrorMessage,
  EDIT_REQUEST_PATH_TO_FIELD,
  type EditContractValues,
  editContractSchema,
  type NewContractValues,
  newContractSchema,
  REQUEST_PATH_TO_FIELD,
  type RentTermsValues,
  toCreateRequest,
  toUpdateRequest,
} from '../lib/contract-form'
import { ADJUSTMENT_INDEX_LABEL, CONTRACT_TYPE_LABEL, contractTypeFor } from '../lib/labels'

const ADJUSTMENT_OPTIONS = (Object.entries(ADJUSTMENT_INDEX_LABEL) as [RentTermsValues['adjustmentIndex'] & string, string][]).map(
  ([value, label]) => ({ value, label }),
)

function RentTermsFields() {
  const { register, control, formState } = useFormContext<RentTermsValues>()
  const { errors } = formState
  return (
    <FormSection title="Aluguel" description="O aluguel do contrato ativo é a receita do imóvel nos indicadores.">
      <Field label="Aluguel mensal" error={errors.monthlyRent?.message}>
        {(controlProps) => (
          <AffixInput {...controlProps} prefix="R$" inputMode="decimal" autoComplete="off" placeholder="0,00" {...register('monthlyRent')} />
        )}
      </Field>
      <Field label="Dia do vencimento" error={errors.dueDay?.message}>
        {(controlProps) => (
          <AffixInput {...controlProps} inputMode="numeric" autoComplete="off" placeholder="10" {...register('dueDay')} />
        )}
      </Field>
      <Field label="Índice de reajuste" error={errors.adjustmentIndex?.message}>
        {(controlProps) => (
          <Controller
            control={control}
            name="adjustmentIndex"
            render={({ field }) => (
              <OptionSelect
                control={controlProps}
                value={field.value}
                options={ADJUSTMENT_OPTIONS}
                emptyLabel="Sem índice"
                placeholder="Sem índice"
                onChange={field.onChange}
              />
            )}
          />
        )}
      </Field>
    </FormSection>
  )
}

const NEW_FORM_ERRORS = { fields: REQUEST_PATH_TO_FIELD, translate: apiMessageInPortuguese, fallback: contractErrorMessage }
const EDIT_FORM_ERRORS = { ...NEW_FORM_ERRORS, fields: EDIT_REQUEST_PATH_TO_FIELD }

interface NewContractFormProps {
  initialValues: NewContractValues
  /** The properties that take contracts. */
  properties: Property[]
  cancel: LinkProps
  onSubmit: (request: CreateContractRequest) => Promise<unknown>
}

export function NewContractForm({ initialValues, properties, cancel, onSubmit }: NewContractFormProps) {
  const contractTypeOf = (id: string) => {
    const property = properties.find((p) => p.id === id)
    return property ? contractTypeFor(property) : undefined
  }
  const form = useForm<NewContractValues>({
    resolver: zodResolver(newContractSchema(contractTypeOf)),
    defaultValues: initialValues,
  })
  const { control, setError, handleSubmit, formState } = form
  const { errors, isSubmitting } = formState
  const propertyId = useWatch({ control, name: 'propertyId' })
  const property = properties.find((p) => p.id === propertyId)
  const contractType = property ? contractTypeFor(property) : undefined
  const active = useQuery(activeContractQueryOptions(propertyId)).data

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toCreateRequest(values, contractTypeOf(values.propertyId)!))
    } catch (failure) {
      showApiError(failure, setError, NEW_FORM_ERRORS)
    }
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormError message={errors.root?.message} />

        <FormSection
          title="Imóvel"
          description="Aparecem os imóveis que podem ter contrato: os que não são de uso próprio nem comodato."
        >
          <Field
            label="Imóvel"
            error={errors.propertyId?.message}
            className="sm:col-span-2"
            hint={
              contractType === 'short_stay'
                ? 'Imóvel de temporada: o contrato não tem aluguel fixo, a receita vem das reservas.'
                : contractType === 'conventional'
                  ? `Contrato de ${CONTRACT_TYPE_LABEL.conventional.toLowerCase()}, com aluguel mensal.`
                  : undefined
            }
          >
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
          {active && (
            <p className="flex items-start gap-2 rounded-2xl bg-pastel-yellow px-4 py-3 text-sm sm:col-span-2">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {property?.name} já tem um contrato ativo com {active.occupant.name}, desde{' '}
                {formatNumericDate(active.startDate)}. Ao salvar este, aquele é encerrado.
              </span>
            </p>
          )}
          {property && property.rentalMode === 'manual' && (
            <p className="flex items-start gap-2 rounded-2xl bg-pastel-yellow px-4 py-3 text-sm sm:col-span-2">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                O aluguel deste imóvel é informado no próprio imóvel. Para ele ter contratos, edite o imóvel e escolha
                "Do contrato ativo" em "De onde vem o aluguel".
              </span>
            </p>
          )}
        </FormSection>

        <OccupantFields title="Ocupante" description={contractType === 'short_stay' ? 'Quem ocupa o imóvel.' : 'O inquilino.'} />

        <FormSection title="Vigência">
          <DateField<NewContractValues> name="startDate" label="Início" />
          <DateField<NewContractValues> name="endDate" label="Fim" hint="Deixe em branco para prazo indeterminado." />
        </FormSection>

        {contractType !== 'short_stay' && <RentTermsFields />}
        <NotesSection />

        <FormFooter cancel={cancel} submitLabel="Cadastrar contrato" submitting={isSubmitting} />
      </form>
    </FormProvider>
  )
}

interface EditContractFormProps {
  contract: Contract
  initialValues: EditContractValues
  cancel: LinkProps
  onSubmit: (request: UpdateContractRequest) => Promise<unknown>
}

/** The property, the type, the occupant and the start are fixed; the rest can change while the contract is active. */
export function EditContractForm({ contract, initialValues, cancel, onSubmit }: EditContractFormProps) {
  const form = useForm<EditContractValues>({
    resolver: zodResolver(editContractSchema(contract)),
    defaultValues: initialValues,
  })
  const { setError, handleSubmit, formState } = form

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toUpdateRequest(values, contract.contractType))
    } catch (failure) {
      showApiError(failure, setError, EDIT_FORM_ERRORS)
    }
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormError message={formState.errors.root?.message} />
        <FormSection title="Vigência" description={`Começou em ${formatNumericDate(contract.startDate)}.`}>
          <DateField<EditContractValues> name="endDate" label="Fim" hint="Deixe em branco para prazo indeterminado." />
        </FormSection>
        {contract.contractType === 'conventional' && <RentTermsFields />}
        <NotesSection />
        <FormFooter cancel={cancel} submitLabel="Salvar alterações" submitting={formState.isSubmitting} />
      </form>
    </FormProvider>
  )
}
