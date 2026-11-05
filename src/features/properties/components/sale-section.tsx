import { useQuery } from '@tanstack/react-query'
import { Check, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form'
import { AffixInput } from '@/components/form/affix-input'
import { Field } from '@/components/form/field'
import { FormSection as Section } from '@/components/form/form-section'
import { SwitchField } from '@/components/form/switch-field'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { photosQueryOptions } from '../api/files'
import { type ListingGap, listingGaps, type PropertyFormValues } from '../lib/property-form'

const GAP_TEXT: Record<ListingGap, string> = {
  address: 'Informe a cidade e o bairro, em Endereço.',
  area: 'Informe a área privativa ou a total, em Características.',
}

const PUBLIC_FIELDS = ['A foto de capa', 'A metragem', 'O bairro e a cidade', 'O preço de venda']
const PRIVATE_FIELDS = ['O nome interno do imóvel', 'A rua e o número', 'O proprietário e o cliente']

interface SaleSectionProps {
  form: UseFormReturn<PropertyFormValues>
  /** Set when editing: the photos already sent tell whether one is still missing. */
  propertyId: string | undefined
  /** The property was already for sale when the form opened: the owner agreed before. */
  wasForSale: boolean
  error: string | undefined
}

/** The "Venda" card: the switch, its consent dialog, the price and what the listing still lacks. */
export function SaleSection({ form, propertyId, wasForSale, error }: SaleSectionProps) {
  const { control, register } = form
  const [confirming, setConfirming] = useState(false)
  const values = useWatch({ control }) as PropertyFormValues
  const photos = useQuery({ ...photosQueryOptions(propertyId ?? ''), enabled: propertyId !== undefined })

  const gaps = values.forSale ? listingGaps(values) : []
  const photoUnknown = propertyId === undefined
  const photoMissing = photoUnknown || (photos.data !== undefined && photos.data.length === 0)
  const checkingPhotos = !photoUnknown && photos.isPending

  return (
    <Section title="Venda" description="Anuncie o imóvel na plataforma, para quem procura comprar.">
      <div className="sm:col-span-2">
        <Controller
          control={control}
          name="forSale"
          render={({ field }) => (
            <>
              <SwitchField
                label="À venda"
                checked={field.value}
                onChange={(next) => {
                  if (next && !wasForSale) setConfirming(true)
                  else field.onChange(next)
                }}
              />
              <AlertDialog open={confirming} onOpenChange={setConfirming}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Anunciar este imóvel?</AlertDialogTitle>
                    <AlertDialogDescription>Este imóvel aparecerá em formato de anúncio nesta plataforma.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="font-medium">Fica público</p>
                      <ul className="mt-1.5 grid gap-1 text-muted-foreground">
                        {PUBLIC_FIELDS.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">Nunca aparece</p>
                      <ul className="mt-1.5 grid gap-1 text-muted-foreground">
                        {PRIVATE_FIELDS.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel size="lg" className="h-10 px-5">
                      Cancelar
                    </AlertDialogCancel>
                    <Button
                      size="lg"
                      className="h-10 px-5"
                      onClick={() => {
                        field.onChange(true)
                        setConfirming(false)
                      }}
                    >
                      Anunciar
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        />
      </div>

      {values.forSale && (
        <>
          <Field label="Preço de venda" error={error} hint="É o preço do anúncio; o valor estimado nunca aparece.">
            {(controlProps) => (
              <AffixInput {...controlProps} inputMode="decimal" autoComplete="off" prefix="R$" placeholder="450.000,00" {...register('salePrice')} />
            )}
          </Field>

          <div
            className="rounded-xl bg-pastel-yellow px-4 py-3 text-sm sm:col-span-2"
            aria-live="polite"
            data-testid="listing-gaps"
          >
            {gaps.length > 0 || photoMissing ? (
              <>
                <p className="flex items-center gap-2 font-medium">
                  <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />O anúncio só vai ao ar com
                </p>
                <ul className="mt-1.5 list-disc pl-10 text-foreground/80">
                  {photoMissing && (
                    <li>
                      {photoUnknown
                        ? 'Adicione ao menos uma foto depois de salvar.'
                        : 'Adicione ao menos uma foto, na galeria do imóvel.'}
                    </li>
                  )}
                  {gaps.map((gap) => (
                    <li key={gap}>{GAP_TEXT[gap]}</li>
                  ))}
                </ul>
              </>
            ) : checkingPhotos ? null : (
              <p className="flex items-center gap-2 font-medium">
                <Check className="size-4 shrink-0" aria-hidden="true" />
                Está tudo certo: o anúncio vai ao ar ao salvar.
              </p>
            )}
          </div>
        </>
      )}
    </Section>
  )
}
