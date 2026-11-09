import { Link, type LinkProps } from '@tanstack/react-router'
import { Button, buttonVariants } from '@/components/ui/button'

/** The sticky bar at the bottom of a form: where Cancelar goes, and the submit button. */
export function FormFooter({ cancel, submitLabel, submitting }: { cancel: LinkProps; submitLabel: string; submitting: boolean }) {
  return (
    <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
      <Link {...cancel} className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'h-10 px-5' })}>
        Cancelar
      </Link>
      <Button type="submit" size="lg" className="h-10 px-6" disabled={submitting}>
        {submitting ? 'Salvando…' : submitLabel}
      </Button>
    </div>
  )
}
