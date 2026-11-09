import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ComponentProps } from 'react'
import { PropertyForm } from './property-form'

interface PropertyFormPageProps extends ComponentProps<typeof PropertyForm> {
  title: string
  description: string
}

/** The frame around the property form, for creating and for editing. */
export function PropertyFormPage({ title, description, ...form }: PropertyFormPageProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-8 sm:pt-10">
      <Link {...form.cancel} className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      <PropertyForm {...form} />
    </main>
  )
}
