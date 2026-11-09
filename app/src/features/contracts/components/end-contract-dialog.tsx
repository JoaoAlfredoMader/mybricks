import { CircleStop } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Field } from '@/components/form/field'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'
import { formatNumericDate } from '@/lib/format'
import { maskDate, parseDate, todayInput } from '@/lib/parse'
import type { Contract } from '../api/queries'
import { useEndContract } from '../hooks/use-contract-mutations'
import { apiMessageInPortuguese, contractErrorMessage } from '../lib/contract-form'

/** Ends an active contract on a chosen day (today by default); the property is free for a new one. */
export function EndContractDialog({ contract }: { contract: Contract }) {
  const end = useEndContract(contract.id)
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const endDate = parseDate(date)
    if (!endDate) return setProblem('Informe o dia no formato dd/mm/aaaa.')
    if (endDate <= contract.startDate) {
      return setProblem(`O fim precisa ser depois do início (${formatNumericDate(contract.startDate)}).`)
    }
    setProblem(null)
    try {
      await end.mutateAsync(endDate)
      setOpen(false)
    } catch (error) {
      const field = error instanceof ApiError ? error.fieldErrors[0] : undefined
      setProblem(field ? apiMessageInPortuguese(field.message) : contractErrorMessage(error, 'Não foi possível encerrar agora. Tente de novo.'))
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDate(todayInput())
        setProblem(null)
      }}
    >
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="lg" className="h-10 px-5">
            <CircleStop aria-hidden="true" />
            Encerrar
          </Button>
        }
      />
      <AlertDialogContent>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar o contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              {contract.occupant.name} deixa o imóvel nesta data e o contrato fica como encerrado. O imóvel fica livre
              para um novo contrato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field label="Último dia do contrato" error={problem ?? undefined}>
            {(control) => (
              <Input
                {...control}
                className="h-10"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                autoComplete="off"
                autoFocus
                value={date}
                onChange={(event) => setDate(maskDate(event.target.value))}
              />
            )}
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel size="lg" className="h-10 px-5" disabled={end.isPending}>
              Voltar
            </AlertDialogCancel>
            <Button type="submit" size="lg" className="h-10 px-5" disabled={end.isPending}>
              {end.isPending ? 'Encerrando…' : 'Encerrar contrato'}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
