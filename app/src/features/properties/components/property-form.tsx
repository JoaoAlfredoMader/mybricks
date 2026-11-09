import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { CircleAlert } from 'lucide-react'
import { Controller, type FieldPath, useForm, useWatch } from 'react-hook-form'
import { AffixInput } from '@/components/form/affix-input'
import { ChoiceGroup } from '@/components/form/choice-group'
import { Field } from '@/components/form/field'
import { FormSection as Section } from '@/components/form/form-section'
import { OptionSelect } from '@/components/form/option-select'
import { SwitchField } from '@/components/form/switch-field'
import { Textarea } from '@/components/form/textarea'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'
import { maskDate } from '@/lib/parse'
import type { PropertyCatalog } from '../api/queries'
import {
  ACQUISITION_LABEL,
  AMORTIZATION_LABEL,
  CONSERVATION_LABEL,
  PROPERTY_TYPE_LABEL,
  type PropertyType,
  USAGE_LABEL,
} from '../lib/labels'
import {
  apiMessageInPortuguese,
  canBeFinanced,
  earnsIncome,
  propertyFormSchema,
  type PropertyFormValues,
  type PropertyRequest,
  REQUEST_PATH_TO_FIELD,
  toPropertyRequest,
} from '../lib/property-form'
import { CityCombobox } from './city-combobox'
import { SaleSection } from './sale-section'

function entries<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }))
}

interface PropertyFormProps {
  initialValues: PropertyFormValues
  catalog: PropertyCatalog
  clients: { id: string; name: string }[]
  agencies: { id: string; name: string }[]
  submitLabel: string
  /** Set when editing an existing property. */
  propertyId?: string
  /** Where "Cancelar" goes. */
  cancel: { to: '/app/imoveis' } | { to: '/app/imoveis/$propertyId'; params: { propertyId: string } }
  onSubmit: (request: PropertyRequest) => Promise<unknown>
}

export function PropertyForm({ initialValues, catalog, clients, agencies, submitLabel, propertyId, cancel, onSubmit }: PropertyFormProps) {
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema(catalog)),
    defaultValues: initialValues,
  })
  const { register, control, setValue, setError, handleSubmit, formState } = form
  const { errors, isSubmitting } = formState
  const error = (name: FieldPath<PropertyFormValues>) => errors[name as keyof PropertyFormValues]?.message

  // The fields that open, close or narrow other fields.
  const [propertyType, usageType, rentalMode, acquisitionType, hasFinancing, registrationStatus, insured] = useWatch({
    control,
    name: ['propertyType', 'usageType', 'rentalMode', 'acquisitionType', 'hasFinancing', 'registrationStatus', 'insured'],
  })

  const typeEntry = catalog.find((entry) => entry.propertyType === propertyType)
  const subtypes = typeEntry?.subtypes ?? []
  const usages = typeEntry ? typeEntry.usageTypes.map((u) => ({ value: u, label: USAGE_LABEL[u] })) : []

  /** A new type keeps the subtype and usage only if they still fit it. */
  function changeType(next: PropertyType | '') {
    setValue('propertyType', next, { shouldValidate: formState.isSubmitted })
    const entry = catalog.find((e) => e.propertyType === next)
    if (!entry?.subtypes.some((s) => String(s.id) === form.getValues('subtypeId'))) setValue('subtypeId', '')
    const usage = form.getValues('usageType')
    if (usage && !entry?.usageTypes.includes(usage)) setValue('usageType', '')
  }

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toPropertyRequest(values))
    } catch (failure) {
      if (failure instanceof ApiError && failure.fieldErrors.length > 0) {
        const unplaced: string[] = []
        for (const { path, message } of failure.fieldErrors) {
          const field = REQUEST_PATH_TO_FIELD[path]
          if (field) setError(field, { message: apiMessageInPortuguese(message) }, { shouldFocus: true })
          else unplaced.push(apiMessageInPortuguese(message))
        }
        if (unplaced.length > 0) setError('root', { message: unplaced.join(' ') })
      } else {
        setError('root', { message: 'Não foi possível salvar agora. Verifique a conexão e tente de novo.' })
      }
    }
  })

  const text = (name: FieldPath<PropertyFormValues>, label: string, options: { hint?: string; className?: string } = {}) => (
    <Field label={label} error={error(name)} hint={options.hint} className={options.className}>
      {(controlProps) => <Input {...controlProps} className="h-10" {...register(name)} />}
    </Field>
  )

  const number = (
    name: FieldPath<PropertyFormValues>,
    label: string,
    affix: { prefix?: string; suffix?: string; hint?: string; placeholder?: string } = {},
  ) => (
    <Field label={label} error={error(name)} hint={affix.hint}>
      {(controlProps) => (
        <AffixInput
          {...controlProps}
          inputMode="decimal"
          autoComplete="off"
          placeholder={affix.placeholder}
          prefix={affix.prefix}
          suffix={affix.suffix}
          {...register(name)}
        />
      )}
    </Field>
  )

  const date = (name: 'acquiredOn' | 'firstInstallmentOn', label: string, hint?: string) => (
    <Field label={label} error={error(name)} hint={hint}>
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
              value={field.value}
              onBlur={field.onBlur}
              ref={field.ref}
              onChange={(event) => field.onChange(maskDate(event.target.value))}
            />
          )}
        />
      )}
    </Field>
  )

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {errors.root?.message && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {errors.root.message}
        </p>
      )}

      <Section title="Identificação">
        {text('name', 'Nome', { hint: 'Como você chama este imóvel, por exemplo "Apartamento Centro".', className: 'sm:col-span-2' })}
        <Field label="Tipo" error={error('propertyType')}>
          {(controlProps) => (
            <OptionSelect control={controlProps} value={propertyType} options={entries(PROPERTY_TYPE_LABEL)} onChange={changeType} />
          )}
        </Field>
        <Field label="Subtipo" error={error('subtypeId')}>
          {(controlProps) => (
            <Controller
              control={control}
              name="subtypeId"
              render={({ field }) => (
                <OptionSelect
                  control={controlProps}
                  value={field.value}
                  options={subtypes.map((s) => ({ value: String(s.id), label: s.name }))}
                  {...(subtypes.length > 0 ? { emptyLabel: 'Sem subtipo' } : {})}
                  placeholder={propertyType ? 'Sem subtipo' : 'Escolha o tipo antes'}
                  disabled={subtypes.length === 0}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Field>
        <Field label="Uso" error={error('usageType')} hint={propertyType ? undefined : 'Os usos dependem do tipo.'}>
          {(controlProps) => (
            <Controller
              control={control}
              name="usageType"
              render={({ field }) => (
                <OptionSelect
                  control={controlProps}
                  value={field.value}
                  options={usages}
                  placeholder={propertyType ? 'Escolha' : 'Escolha o tipo antes'}
                  disabled={usages.length === 0}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Field>
        {number('ownershipPercentage', 'Sua participação', { suffix: '%', hint: 'A parte do imóvel que é sua. Pondera os indicadores.' })}
      </Section>

      <Section title="Endereço" description="Opcional. Se preencher, informe ao menos a cidade e a rua.">
        <Field label="Cidade" error={error('city')} className="sm:col-span-2">
          {(controlProps) => (
            <Controller
              control={control}
              name="city"
              render={({ field }) => <CityCombobox control={controlProps} value={field.value} onChange={field.onChange} />}
            />
          )}
        </Field>
        {text('street', 'Rua', { className: 'sm:col-span-2' })}
        {text('number', 'Número')}
        {text('complement', 'Complemento')}
        {text('neighborhood', 'Bairro')}
        {text('postalCode', 'CEP', { hint: '8 dígitos' })}
      </Section>

      <Section title="Características">
        {number('totalArea', 'Área total', { suffix: 'm²' })}
        {number('privateArea', 'Área privativa', { suffix: 'm²' })}
        {number('bedrooms', 'Quartos')}
        {number('suites', 'Suítes')}
        {number('bathrooms', 'Banheiros')}
        {number('parkingSpaces', 'Vagas')}
        {propertyType === 'parking' && text('parkingSpotLabel', 'Identificação da vaga', { hint: 'Por exemplo "G2-14".' })}
        {number('builtYear', 'Ano de construção', { placeholder: '2012' })}
        <Field label="Conservação" error={error('conservationState')}>
          {(controlProps) => (
            <Controller
              control={control}
              name="conservationState"
              render={({ field }) => (
                <OptionSelect
                  control={controlProps}
                  value={field.value}
                  options={entries(CONSERVATION_LABEL)}
                  emptyLabel="Não informado"
                  placeholder="Não informado"
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Field>
      </Section>

      <Section title="Valores" description="Base do yield, do cap rate e da TIR.">
        {number('estimatedValue', 'Valor estimado', { prefix: 'R$', placeholder: '680.000,00' })}
        {number('annualExpenses', 'Despesas por ano', { prefix: 'R$', hint: 'Condomínio, IPTU, manutenção…' })}
        {number('occupancyRate', 'Ocupação esperada', { suffix: '%', hint: 'Quanto do ano o imóvel deve ficar ocupado.' })}
      </Section>

      <SaleSection form={form} propertyId={propertyId} wasForSale={initialValues.forSale} error={error('salePrice')} />

      {earnsIncome(usageType) && (
        <Section title="Aluguel">
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="rentalMode"
              render={({ field }) => (
                <ChoiceGroup
                  label="De onde vem o aluguel"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'manual', label: 'Informado aqui' },
                    { value: 'contract', label: 'Do contrato ativo' },
                  ]}
                  hint={
                    field.value === 'contract'
                      ? 'O aluguel e o inquilino vêm do contrato cadastrado para este imóvel.'
                      : 'Para imóveis sem contrato no sistema.'
                  }
                />
              )}
            />
          </div>
          {rentalMode === 'manual' && (
            <>
              {text('tenantName', 'Inquilino')}
              {number('monthlyRent', 'Aluguel mensal', { prefix: 'R$' })}
              {number('dueDay', 'Dia do vencimento', { placeholder: '10' })}
            </>
          )}
        </Section>
      )}

      <Section title="Aquisição" description="Início e custo da TIR.">
        <Field label="Forma de aquisição" error={error('acquisitionType')}>
          {(controlProps) => (
            <Controller
              control={control}
              name="acquisitionType"
              render={({ field }) => (
                <OptionSelect
                  control={controlProps}
                  value={field.value}
                  options={entries(ACQUISITION_LABEL)}
                  emptyLabel="Não informada"
                  placeholder="Não informada"
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Field>
        {acquisitionType && (
          <>
            {date('acquiredOn', acquisitionType === 'inheritance' ? 'Data base' : 'Data')}
            {number('acquisitionCost', acquisitionType === 'inheritance' ? 'Custo base' : 'Custo', { prefix: 'R$' })}
          </>
        )}
        {canBeFinanced(acquisitionType) && (
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="hasFinancing"
              render={({ field }) => (
                <SwitchField label="Foi financiado" checked={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        )}
      </Section>

      {canBeFinanced(acquisitionType) && hasFinancing && (
        <Section title="Financiamento">
          {text('lender', 'Credor')}
          {number('financedAmount', 'Valor financiado', { prefix: 'R$' })}
          {number('termMonths', 'Prazo', { suffix: 'meses' })}
          {number('annualInterestRate', 'Juros', { suffix: '% a.a.' })}
          <Controller
            control={control}
            name="amortizationSystem"
            render={({ field }) => (
              <ChoiceGroup label="Amortização" value={field.value} onChange={field.onChange} options={entries(AMORTIZATION_LABEL)} />
            )}
          />
          {date('firstInstallmentOn', 'Primeira parcela')}
        </Section>
      )}

      <Section title="Documentação">
        <Field label="Registro" error={error('registrationStatus')}>
          {(controlProps) => (
            <Controller
              control={control}
              name="registrationStatus"
              render={({ field }) => (
                <OptionSelect
                  control={controlProps}
                  value={field.value}
                  options={[
                    { value: 'regular', label: 'Regular' },
                    { value: 'irregular', label: 'Irregular' },
                  ]}
                  emptyLabel="Não informado"
                  placeholder="Não informado"
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Field>
        {text('registryNumber', 'Matrícula')}
        {registrationStatus === 'irregular' && (
          <Field label="O que está irregular" error={error('irregularityDescription')} className="sm:col-span-2">
            {(controlProps) => <Textarea {...controlProps} {...register('irregularityDescription')} />}
          </Field>
        )}
        {text('registryOffice', 'Cartório', { className: 'sm:col-span-2' })}
        <Field label="Observações do registro" className="sm:col-span-2">
          {(controlProps) => <Textarea {...controlProps} className="min-h-20" {...register('registryNotes')} />}
        </Field>
        <div className="sm:col-span-2">
          <Controller
            control={control}
            name="insured"
            render={({ field }) => <SwitchField label="Tem seguro" checked={field.value} onChange={field.onChange} />}
          />
        </div>
        {insured && (
          <Field label="Seguro" hint="Apólice, seguradora, renovação…" className="sm:col-span-2">
            {(controlProps) => <Textarea {...controlProps} className="min-h-20" {...register('insuranceDescription')} />}
          </Field>
        )}
      </Section>

      <Section title="Proprietário e gestão">
        <Field label="Cliente" error={error('clientId')}>
          {(controlProps) => (
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <OptionSelect
                  control={controlProps}
                  value={field.value}
                  options={clients.map((c) => ({ value: c.id, label: c.name }))}
                  emptyLabel="Nenhum"
                  placeholder="Nenhum"
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Field>
        <Field label="Imobiliária" error={error('agencyId')}>
          {(controlProps) => (
            <Controller
              control={control}
              name="agencyId"
              render={({ field }) => (
                <OptionSelect
                  control={controlProps}
                  value={field.value}
                  options={agencies.map((a) => ({ value: a.id, label: a.name }))}
                  emptyLabel="Nenhuma"
                  placeholder="Nenhuma"
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          {(controlProps) => <Textarea {...controlProps} {...register('notes')} />}
        </Field>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <Link {...cancel} className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'h-10 px-5' })}>
          Cancelar
        </Link>
        <Button type="submit" size="lg" className="h-10 px-6" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
