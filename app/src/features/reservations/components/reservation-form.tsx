import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link, type LinkProps } from '@tanstack/react-router'
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
import { contractQueryOptions, contractsQueryOptions } from '@/features/contracts/api/queries'
import { CONTRACT_STATUS } from '@/features/contracts/lib/labels'
import { contractPeriod } from '@/features/contracts/lib/period'
import { OccupantFields } from '@/features/occupants/components/occupant-fields'
import type { Property } from '@/features/properties/api/queries'
import type { CreateReservationRequest, UpdateReservationRequest } from '../api/queries'
import {
  apiMessageInPortuguese,
  EDIT_REQUEST_PATH_TO_FIELD,
  type EditReservationValues,
  editReservationSchema,
  type NewReservationValues,
  newReservationSchema,
  REQUEST_PATH_TO_FIELD,
  reservationErrorMessage,
  type StayValues,
  toCreateRequest,
  toUpdateRequest,
} from '../lib/reservation-form'

const NEW_FORM_ERRORS = { fields: REQUEST_PATH_TO_FIELD, translate: apiMessageInPortuguese, fallback: reservationErrorMessage }
const EDIT_FORM_ERRORS = { ...NEW_FORM_ERRORS, fields: EDIT_REQUEST_PATH_TO_FIELD }

/** The property's active short-stay contracts, plus the one already linked (whatever its status). */
function ContractSelect({ propertyId, linkedContractId }: { propertyId: string; linkedContractId?: string | undefined }) {
  const { control, formState } = useFormContext<StayValues>()
  const active =
    useQuery({
      ...contractsQueryOptions({ page: 1, propertyId, status: 'active', contractType: 'short_stay' }, 50),
      enabled: propertyId !== '',
    }).data?.items ?? []
  const linked = useQuery({ ...contractQueryOptions(linkedContractId ?? ''), enabled: Boolean(linkedContractId) }).data
  const contracts = linked && !active.some((contract) => contract.id === linked.id) ? [linked, ...active] : active
  if (contracts.length === 0) return null

  const options = contracts.map((contract) => ({
    value: contract.id,
    label: `${contract.occupant.name} · ${contractPeriod(contract)}${
      contract.status === 'active' ? '' : ` (${CONTRACT_STATUS[contract.status].label.toLowerCase()})`
    }`,
  }))

  return (
    <Field
      label="Contrato de temporada"
      error={formState.errors.contractId?.message}
      hint="Opcional. A estadia precisa caber na vigência do contrato."
      className="sm:col-span-2"
    >
      {(controlProps) => (
        <Controller
          control={control}
          name="contractId"
          render={({ field }) => (
            <OptionSelect
              control={controlProps}
              value={field.value}
              options={options}
              emptyLabel="Nenhum"
              placeholder="Nenhum"
              onChange={field.onChange}
            />
          )}
        />
      )}
    </Field>
  )
}

/** The dates and the total, shared by the new and the edit form. */
function StayFields({ propertyId, linkedContractId }: { propertyId: string; linkedContractId?: string }) {
  const { register, formState } = useFormContext<StayValues>()
  return (
    <>
      <FormSection title="Estadia">
        <DateField<StayValues> name="checkIn" label="Entrada" />
        <DateField<StayValues> name="checkOut" label="Saída" hint="Pode ser o mesmo dia da entrada de outra reserva." />
      </FormSection>
      <FormSection title="Valor e contrato">
        <Field label="Valor total" error={formState.errors.totalAmount?.message} hint="Pode ficar em branco se ainda não foi combinado.">
          {(controlProps) => (
            <AffixInput {...controlProps} prefix="R$" inputMode="decimal" autoComplete="off" placeholder="0,00" {...register('totalAmount')} />
          )}
        </Field>
        <ContractSelect propertyId={propertyId} linkedContractId={linkedContractId} />
      </FormSection>
    </>
  )
}

interface NewReservationFormProps {
  initialValues: NewReservationValues
  /** The short-stay properties. */
  properties: Property[]
  cancel: LinkProps
  onSubmit: (request: CreateReservationRequest) => Promise<unknown>
}

export function NewReservationForm({ initialValues, properties, cancel, onSubmit }: NewReservationFormProps) {
  const form = useForm<NewReservationValues>({
    resolver: zodResolver(newReservationSchema),
    defaultValues: initialValues,
  })
  const { control, setError, setValue, handleSubmit, formState } = form
  const { errors, isSubmitting } = formState
  const propertyId = useWatch({ control, name: 'propertyId' })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toCreateRequest(values))
    } catch (failure) {
      showApiError(failure, setError, NEW_FORM_ERRORS)
    }
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormError message={errors.root?.message} />

        <FormSection title="Imóvel" description="Só imóveis de temporada têm reservas.">
          {properties.length === 0 ? (
            <p className="flex items-start gap-2 rounded-2xl bg-pastel-yellow px-4 py-3 text-sm sm:col-span-2">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Nenhum imóvel de temporada ainda.{' '}
                <Link to="/app/imoveis/novo" className="font-medium underline underline-offset-4">
                  Cadastre um imóvel
                </Link>{' '}
                com uso "Temporada" para receber reservas.
              </span>
            </p>
          ) : (
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
                      onChange={(next) => {
                        field.onChange(next)
                        // A contract belongs to one property.
                        setValue('contractId', '')
                      }}
                    />
                  )}
                />
              )}
            </Field>
          )}
        </FormSection>

        <OccupantFields title="Hóspede" description="Quem vai ficar no imóvel." />
        <StayFields propertyId={propertyId} />
        <NotesSection />

        <FormFooter cancel={cancel} submitLabel="Cadastrar reserva" submitting={isSubmitting} />
      </form>
    </FormProvider>
  )
}

interface EditReservationFormProps {
  propertyId: string
  initialValues: EditReservationValues
  /** The contract linked now, if any: it stays in the menu even if it is no longer active. */
  linkedContractId: string | null
  cancel: LinkProps
  onSubmit: (request: UpdateReservationRequest) => Promise<unknown>
}

/** The property and the guest are fixed; the stay, the total, the contract and the notes can change. */
export function EditReservationForm({ propertyId, initialValues, linkedContractId, cancel, onSubmit }: EditReservationFormProps) {
  const form = useForm<EditReservationValues>({
    resolver: zodResolver(editReservationSchema),
    defaultValues: initialValues,
  })
  const { setError, handleSubmit, formState } = form

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toUpdateRequest(values, initialValues))
    } catch (failure) {
      showApiError(failure, setError, EDIT_FORM_ERRORS)
    }
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <FormError message={formState.errors.root?.message} />
        <StayFields propertyId={propertyId} {...(linkedContractId ? { linkedContractId } : {})} />
        <NotesSection />
        <FormFooter cancel={cancel} submitLabel="Salvar alterações" submitting={formState.isSubmitting} />
      </form>
    </FormProvider>
  )
}
