import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'
import { agenciesQueryOptions } from '../api/queries'
import { useCreateAgency, useDeleteAgency, useRenameAgency } from '../hooks/use-agency-mutations'
import { SectionTabs } from './section-tabs'

const MIN_NAME = 2

/** What the API says about an agency, in Portuguese: a name that is too short, or an agency still in use. */
function agencyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.fieldErrors.some((field) => field.path === 'name')) return `Informe o nome (pelo menos ${MIN_NAME} letras).`
    const details = error.details as { properties?: unknown } | null
    if (error.status === 409 && typeof details?.properties === 'number') {
      const count = details.properties
      return `Esta imobiliária ainda administra ${count} ${count === 1 ? 'imóvel' : 'imóveis'}. Passe-os para outra imobiliária ou tire a imobiliária deles antes.`
    }
    if (error.status === 403) return 'Exclusões ficam bloqueadas enquanto você vê o sistema como outra pessoa.'
  }
  return fallback
}

interface NameFormProps {
  label: string
  initial?: string
  submitLabel: string
  pending: boolean
  onSubmit: (name: string) => Promise<unknown>
  onCancel?: () => void
  className?: string
}

/** One name field with its button: used to add an agency and to rename one. */
function NameForm({ label, initial = '', submitLabel, pending, onSubmit, onCancel, className }: NameFormProps) {
  const [name, setName] = useState(initial)
  const [problem, setProblem] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < MIN_NAME) return setProblem(`Informe o nome (pelo menos ${MIN_NAME} letras).`)
    setProblem(null)
    try {
      await onSubmit(trimmed)
      setName(initial)
    } catch (error) {
      setProblem(agencyErrorMessage(error, 'Não foi possível salvar agora. Tente de novo.'))
    }
  }

  return (
    <form onSubmit={submit} noValidate className={cn('grid gap-1.5', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={label}
          aria-invalid={problem ? true : undefined}
          placeholder="Nome da imobiliária"
          value={name}
          maxLength={255}
          autoComplete="off"
          autoFocus={Boolean(onCancel)}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && onCancel?.()}
          className="h-10 w-full sm:w-72"
        />
        <Button type="submit" size="lg" className="h-10 px-5" disabled={pending}>
          {!onCancel && <Plus aria-hidden="true" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" className="h-10 px-4" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
      {problem && (
        <p role="alert" className="text-xs text-destructive">
          {problem}
        </p>
      )}
    </form>
  )
}

interface AgenciesPageProps {
  page: number
  onPageChange: (page: number) => void
  /** False while a platform admin impersonates: the API refuses every DELETE then. */
  canDelete: boolean
}

export function AgenciesPage({ page, onPageChange, canDelete }: AgenciesPageProps) {
  const list = useQuery(agenciesQueryOptions(page))
  const create = useCreateAgency()
  const rename = useRenameAgency()
  const remove = useDeleteAgency()
  const [editing, setEditing] = useState<string | null>(null)
  const data = list.data

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Imobiliárias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data ? `${data.total} ${data.total === 1 ? 'imobiliária' : 'imobiliárias'}, compartilhadas por todos da organização` : ' '}
        </p>
      </header>

      <SectionTabs />

      <NameForm
        label="Nome da nova imobiliária"
        submitLabel="Adicionar"
        pending={create.isPending}
        onSubmit={(name) => create.mutateAsync(name)}
        className="mt-4"
      />

      <section
        aria-label="Lista de imobiliárias"
        aria-busy={list.isFetching}
        className={cn('mt-4 rounded-2xl border bg-card transition-opacity', list.isPlaceholderData && 'opacity-60')}
      >
        {data && data.items.length > 0 ? (
          <ul className="divide-y">
            {data.items.map((agency) => (
              <li key={agency.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Building2 className="size-5" aria-hidden="true" />
                </span>
                {editing === agency.id ? (
                  <NameForm
                    label={`Novo nome de ${agency.name}`}
                    initial={agency.name}
                    submitLabel="Salvar"
                    pending={rename.isPending}
                    onSubmit={async (name) => {
                      await rename.mutateAsync({ id: agency.id, name })
                      setEditing(null)
                    }}
                    onCancel={() => setEditing(null)}
                    className="min-w-0 flex-1"
                  />
                ) : (
                  <>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{agency.name}</p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Renomear ${agency.name}`}
                        onClick={() => setEditing(agency.id)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      {canDelete && (
                        <ConfirmDialog
                          trigger={
                            <Button variant="ghost" size="icon-sm" className="text-destructive" aria-label={`Excluir ${agency.name}`}>
                              <Trash2 aria-hidden="true" />
                            </Button>
                          }
                          title={`Excluir ${agency.name}?`}
                          description="A imobiliária sai do cadastro. Só se pode excluir uma que não administra nenhum imóvel."
                          confirmLabel="Excluir imobiliária"
                          onConfirm={() => remove.mutateAsync(agency.id)}
                          errorMessage={(error) => agencyErrorMessage(error, 'Não foi possível excluir agora. Tente de novo.')}
                        />
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : data ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <p className="font-medium">Nenhuma imobiliária cadastrada ainda</p>
            <p className="text-sm text-muted-foreground">Adicione uma acima para escolhê-la ao cadastrar um imóvel.</p>
          </div>
        ) : null}
      </section>

      {data && data.total > data.pageSize && (
        <div className="mt-4">
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={onPageChange} />
        </div>
      )}
    </main>
  )
}
