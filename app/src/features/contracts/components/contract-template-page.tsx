import { Link } from '@tanstack/react-router'
import { ArrowLeft, CircleAlert, Info, RotateCcw } from 'lucide-react'
import { type RefObject, useMemo, useRef, useState } from 'react'
import { ChoiceGroup } from '@/components/form/choice-group'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { formatTimestamp } from '@/lib/format'
import type { ContractTemplate } from '../api/template'
import { useResetTemplate, useSaveTemplate } from '../hooks/use-template-mutations'
import { cleanTemplateHtml, fillExamples, findUnknownTokens, suggestToken, textOf } from '../lib/template-html'
import { templateExamples } from '../lib/template-examples'
import { ContractDocument } from './contract-document'
import { type EditorHandle, RichTextEditor } from './rich-text-editor'

type Part = 'header' | 'clauses' | 'footer'
type Parts = Record<Part, string>
type Problems = Partial<Record<Part | 'root', string>>

const PARTS: { part: Part; title: string; description: string; size: 'compact' | 'large' }[] = [
  { part: 'header', title: 'Cabeçalho', description: 'No alto do documento, centralizado. Costuma ser o título.', size: 'compact' },
  { part: 'clauses', title: 'Cláusulas', description: 'O corpo do contrato, do preâmbulo ao foro.', size: 'large' },
  { part: 'footer', title: 'Rodapé', description: 'Uma linha no pé do documento.', size: 'compact' },
]

/** The API's limits, checked here first so the message comes with the field. */
const MAX_LENGTH: Record<Part, number> = { header: 5_000, clauses: 100_000, footer: 5_000 }

const cleanParts = (parts: Parts): Parts => ({
  header: cleanTemplateHtml(parts.header),
  clauses: cleanTemplateHtml(parts.clauses),
  footer: cleanTemplateHtml(parts.footer),
})

function check(parts: Parts): Problems {
  const problems: Problems = {}
  if (textOf(parts.clauses) === '') problems.clauses = 'As cláusulas precisam ter texto.'
  for (const part of ['header', 'clauses', 'footer'] as const) {
    if (parts[part].length > MAX_LENGTH[part]) problems[part] = `Texto demais: o limite é ${MAX_LENGTH[part].toLocaleString('pt-BR')} caracteres.`
  }
  return problems
}

/** What the API said, in Portuguese, on the field it concerns when it names one. */
function apiProblems(error: unknown): Problems {
  if (error instanceof ApiError) {
    if (error.status === 403) return { root: 'Só donos e administradores podem editar o modelo de contrato.' }
    if (error.fieldErrors.some((field) => field.path === 'clauses')) return { clauses: 'As cláusulas precisam ter texto.' }
  }
  return { root: 'Não foi possível salvar agora. Verifique a conexão e tente de novo.' }
}

interface ContractTemplatePageProps {
  template: ContractTemplate
  /** Owners and admins; a member can read the template and see the preview. */
  canEdit: boolean
  /** Going back to the default is a delete: the API refuses it while impersonating. */
  canReset: boolean
}

export function ContractTemplatePage({ template, canEdit, canReset }: ContractTemplatePageProps) {
  const save = useSaveTemplate()
  const reset = useResetTemplate()
  const [baseline, setBaseline] = useState(() => cleanParts(template))
  const [draft, setDraft] = useState<Parts>(baseline)
  // The editors keep their own text; a new key starts them over from `draft`.
  const [editorKey, setEditorKey] = useState(0)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [problems, setProblems] = useState<Problems>({})
  const [saved, setSaved] = useState(false)
  const handles: Record<Part, RefObject<EditorHandle | null>> = {
    header: useRef<EditorHandle>(null),
    clauses: useRef<EditorHandle>(null),
    footer: useRef<EditorHandle>(null),
  }
  const lastFocused = useRef<Part>('clauses')

  const cleaned = useMemo(() => cleanParts(draft), [draft])
  const dirty = (['header', 'clauses', 'footer'] as const).some((part) => cleaned[part] !== baseline[part])
  const known = template.placeholders.map((placeholder) => placeholder.token)
  const unknown = findUnknownTokens(known, cleaned.header, cleaned.clauses, cleaned.footer)
  const examples = useMemo(() => templateExamples(), [])

  function startFrom(parts: Parts) {
    setBaseline(parts)
    setDraft(parts)
    setEditorKey((key) => key + 1)
    setProblems({})
    setSaved(false)
  }

  async function submit() {
    const found = check(cleaned)
    if (Object.keys(found).length > 0) return setProblems(found)
    try {
      await save.mutateAsync(cleaned)
      setBaseline(cleaned)
      setProblems({})
      setSaved(true)
    } catch (error) {
      setProblems(apiProblems(error))
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-8 sm:pt-10">
      <Link
        to="/app/contratos"
        className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Contratos
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Modelo de contrato</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O texto de que o PDF de cada contrato de locação é feito. Os marcadores entre chaves são trocados pelos dados do contrato.
          </p>
        </div>
        <ChoiceGroup
          label="Ver"
          value={view}
          onChange={setView}
          options={[
            { value: 'edit', label: 'Editar' },
            { value: 'preview', label: 'Prévia' },
          ]}
        />
      </header>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-pastel-cyan px-4 py-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          {template.isDefault
            ? 'Este é o modelo padrão, um contrato de locação residencial simples. Não é aconselhamento jurídico: revise antes de usar. Ao salvar, a organização passa a ter o seu.'
            : `Modelo da organização, salvo em ${template.updatedAt ? formatTimestamp(template.updatedAt) : '—'}. Os PDFs já gerados não mudam; gere de novo para usar o texto novo.`}
          {!canEdit && ' Só donos e administradores editam o modelo.'}
        </span>
      </p>

      {unknown.length > 0 && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-pastel-yellow px-4 py-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">
              {unknown.length === 1 ? 'Este marcador não existe' : 'Estes marcadores não existem'}: eles saem como estão escritos no PDF.
            </p>
            <ul className="mt-1 grid gap-0.5">
              {unknown.map((token) => {
                const suggestion = suggestToken(token, known)
                return (
                  <li key={token}>
                    <code>{`{{${token}}}`}</code>
                    {suggestion && (
                      <>
                        {' '}
                        — quis dizer <code>{`{{${suggestion}}}`}</code>?
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      {problems.root && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {problems.root}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        {view === 'edit' ? (
          <div className="grid gap-4">
            {PARTS.map(({ part, title, description, size }) => (
              <section key={part} aria-labelledby={`template-${part}`} className="rounded-2xl border bg-card p-5 sm:p-6">
                <h2 id={`template-${part}`} className="font-semibold">
                  {title}
                </h2>
                <p className="text-sm text-muted-foreground">{description}</p>
                <div className="mt-4">
                  <RichTextEditor
                    key={`${part}-${editorKey}`}
                    ref={handles[part]}
                    label={title}
                    initialHtml={draft[part]}
                    size={size}
                    disabled={!canEdit}
                    invalid={Boolean(problems[part])}
                    describedBy={problems[part] ? `template-${part}-error` : undefined}
                    onFocus={() => (lastFocused.current = part)}
                    onChange={(html) => {
                      setDraft((current) => ({ ...current, [part]: html }))
                      setSaved(false)
                      setProblems({})
                    }}
                  />
                </div>
                {problems[part] && (
                  <p id={`template-${part}-error`} className="mt-2 text-xs text-destructive">
                    {problems[part]}
                  </p>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div>
            <p className="mb-3 text-xs text-muted-foreground">
              Prévia com dados de exemplo. O PDF usa os dados do contrato; um marcador que não existe sai como foi escrito.
            </p>
            <ContractDocument
              header={fillExamples(cleaned.header, examples)}
              clauses={fillExamples(cleaned.clauses, examples)}
              footer={fillExamples(cleaned.footer, examples)}
            />
          </div>
        )}

        <aside aria-labelledby="template-tokens" className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-6">
          <h2 id="template-tokens" className="font-semibold">
            Marcadores
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {canEdit && view === 'edit' ? 'Clique para inserir onde o cursor está.' : 'Os dados que o PDF preenche.'}
          </p>
          <ul className="mt-3 grid gap-1">
            {template.placeholders.map(({ token, description }) => (
              <li key={token}>
                <button
                  type="button"
                  disabled={!canEdit || view !== 'edit'}
                  title={description}
                  // Keep the cursor in the text while the token goes in.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handles[lastFocused.current].current?.insert(`{{${token}}}`)}
                  className="w-full rounded-xl px-2.5 py-1.5 text-left text-sm enabled:hover:bg-muted disabled:cursor-default"
                >
                  <code className="font-medium">{`{{${token}}}`}</code>
                  <span className="block text-xs text-muted-foreground">{description}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {canEdit && (
        <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
          {saved && !dirty && (
            <p role="status" className="mr-auto text-sm text-muted-foreground">
              Modelo salvo.
            </p>
          )}
          {canReset && !template.isDefault && (
            <ConfirmDialog
              trigger={
                <Button type="button" variant="ghost" size="lg" className="h-10 px-4">
                  <RotateCcw aria-hidden="true" />
                  Voltar ao padrão
                </Button>
              }
              title="Voltar ao modelo padrão?"
              description="O modelo da organização é apagado e os próximos PDFs usam o contrato padrão. Os PDFs já gerados não mudam."
              confirmLabel="Voltar ao padrão"
              pendingLabel="Voltando…"
              cancelLabel="Cancelar"
              onConfirm={async () => startFrom(cleanParts(await reset.mutateAsync()))}
              errorMessage={(error) => apiProblems(error).root ?? 'Não foi possível voltar ao padrão agora.'}
            />
          )}
          {dirty && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-10 px-4"
              onClick={() => {
                setDraft(baseline)
                setEditorKey((key) => key + 1)
                setProblems({})
              }}
            >
              Descartar alterações
            </Button>
          )}
          <Button type="button" size="lg" className="h-10 px-6" disabled={!dirty || save.isPending} onClick={submit}>
            {save.isPending ? 'Salvando…' : 'Salvar modelo'}
          </Button>
        </div>
      )}
    </main>
  )
}
