import { useQuery } from '@tanstack/react-query'
import { Download, FileSpreadsheet, FileText, ImageIcon, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatBytes, formatTimestamp } from '@/lib/format'
import {
  DOCUMENT_TYPES,
  documentsQueryOptions,
  fileProblem,
  type PropertyDocument,
  uploadErrorMessage,
} from '../api/files'
import { useDocumentActions } from '../hooks/use-property-files'
import { FilePickerButton } from './file-picker-button'

const MAX_CATEGORY = 50

function DocumentIcon({ mimeType }: { mimeType: string }) {
  const Icon = mimeType.startsWith('image/') ? ImageIcon : mimeType.includes('spreadsheet') ? FileSpreadsheet : FileText
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}

function CategoryEditor({ document, onSave, onCancel }: {
  document: PropertyDocument
  onSave: (category: string | null) => Promise<unknown>
  onCancel: () => void
}) {
  const [value, setValue] = useState(document.category ?? '')
  const [saving, setSaving] = useState(false)
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault()
        setSaving(true)
        try {
          await onSave(value.trim() || null)
        } finally {
          setSaving(false)
        }
      }}
    >
      <Input
        aria-label={`Categoria de ${document.fileName}`}
        value={value}
        maxLength={MAX_CATEGORY}
        placeholder="Sem categoria"
        autoFocus
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && onCancel()}
        className="h-8 w-44"
      />
      <Button type="submit" size="sm" disabled={saving}>
        Salvar
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancelar
      </Button>
    </form>
  )
}

interface DocumentListProps {
  propertyId: string
  /** False while impersonating: the API refuses every DELETE then. */
  canDelete: boolean
}

/** Deeds, registry papers, tax and insurance files of the property. */
export function DocumentList({ propertyId, canDelete }: DocumentListProps) {
  const documents = useQuery(documentsQueryOptions(propertyId)).data ?? []
  const { upload, rename, remove } = useDocumentActions(propertyId)
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  async function send([file]: File[]) {
    if (!file) return
    const local = fileProblem(file, DOCUMENT_TYPES, 'documento')
    if (local) return setProblem(local)
    setProblem(null)
    try {
      await upload.mutateAsync({ file, category: category.trim() || null })
      setCategory('')
    } catch (error) {
      setProblem(uploadErrorMessage(error, file.name))
    }
  }

  return (
    <section aria-labelledby="documents-title" className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 id="documents-title" className="font-semibold">
        Documentos
      </h2>
      <p className="text-sm text-muted-foreground">Escritura, matrícula, IPTU, seguro… PDF, imagem, DOCX ou XLSX, até 15 MB.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          aria-label="Categoria do próximo documento"
          placeholder="Categoria (opcional)"
          value={category}
          maxLength={MAX_CATEGORY}
          onChange={(event) => setCategory(event.target.value)}
          className="h-10 w-full sm:w-56"
        />
        <FilePickerButton
          label={upload.isPending ? 'Enviando…' : 'Enviar documento'}
          accept={DOCUMENT_TYPES}
          disabled={upload.isPending}
          onFiles={send}
        />
      </div>

      {problem && (
        <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {problem}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          Nenhum documento ainda.
        </p>
      ) : (
        <ul className="mt-4 divide-y rounded-xl border">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <DocumentIcon mimeType={document.mimeType} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{document.fileName}</p>
                {editing === document.id ? (
                  <div className="mt-1.5">
                    <CategoryEditor
                      document={document}
                      onCancel={() => setEditing(null)}
                      onSave={async (next) => {
                        await rename.mutateAsync({ id: document.id, category: next })
                        setEditing(null)
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {document.category ?? 'Sem categoria'} · {formatBytes(document.sizeBytes)} · {formatTimestamp(document.createdAt)}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Mudar a categoria de ${document.fileName}`}
                  onClick={() => setEditing(document.id)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <a
                  href={document.contentUrl}
                  download={document.fileName}
                  aria-label={`Baixar ${document.fileName}`}
                  className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                >
                  <Download aria-hidden="true" />
                </a>
                {canDelete && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" className="text-destructive" aria-label={`Remover ${document.fileName}`}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    }
                    title="Remover este documento?"
                    description={`"${document.fileName}" sai do imóvel e o arquivo é apagado.`}
                    confirmLabel="Remover documento"
                    onConfirm={() => remove.mutateAsync(document.id)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
