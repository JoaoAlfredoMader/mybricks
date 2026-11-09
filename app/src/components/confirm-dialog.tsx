import { type ReactElement, useState } from 'react'
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

interface ConfirmDialogProps {
  /** The button that opens the dialog. */
  trigger: ReactElement
  title: string
  description: string
  confirmLabel: string
  /** Shown on the confirm button while the action runs. */
  pendingLabel?: string
  /** The button that closes without acting; "Voltar" when the action itself is a cancel. */
  cancelLabel?: string
  /** Throwing keeps the dialog open and shows `errorMessage`. */
  onConfirm: () => Promise<unknown>
  errorMessage?: (error: unknown) => string
}

/** Asks before an action that cannot be undone, such as a delete. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel = 'Excluindo…',
  cancelLabel = 'Cancelar',
  onConfirm,
  errorMessage,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await onConfirm()
      setOpen(false)
    } catch (failure) {
      setError(errorMessage?.(failure) ?? 'Não foi possível concluir. Tente de novo.')
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(null)
      }}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel size="lg" className="h-10 px-5" disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            size="lg"
            className="h-10 bg-destructive px-5 text-white hover:bg-destructive/90"
            disabled={pending}
            onClick={confirm}
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
