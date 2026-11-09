import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface FormPageProps {
  title: string
  description: string
  back: LinkProps
  /** Buttons next to the title, such as Excluir on an edit page. */
  actions?: ReactNode
  children: ReactNode
}

/** The frame around a create/edit form: a way back, the title and what the form is for. */
export function FormPage({ title, description, back, actions, children }: FormPageProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-8 sm:pt-10">
      <Link {...back} className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar
      </Link>
      <header className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </main>
  )
}
