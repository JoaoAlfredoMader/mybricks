import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ImageIcon, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { fileProblem, MAX_PHOTOS, PHOTO_TYPES, photosQueryOptions, uploadErrorMessage } from '../api/files'
import { usePhotoActions } from '../hooks/use-property-files'
import { FilePickerButton } from './file-picker-button'

interface PhotoGalleryProps {
  propertyId: string
  propertyName: string
  /** False while impersonating: the API refuses every DELETE then. */
  canDelete: boolean
}

/** The property's photos, cover first, with upload, reorder and remove. */
export function PhotoGallery({ propertyId, propertyName, canDelete }: PhotoGalleryProps) {
  const photos = useQuery(photosQueryOptions(propertyId)).data ?? []
  const { upload, remove, reorder } = usePhotoActions(propertyId)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [problems, setProblems] = useState<string[]>([])

  async function send(files: File[]) {
    const room = MAX_PHOTOS - photos.length
    const found: string[] = []
    const valid = files.filter((file) => {
      const problem = fileProblem(file, PHOTO_TYPES, 'foto')
      if (problem) found.push(problem)
      return !problem
    })
    if (valid.length > room) found.push(`Cabem só mais ${room} ${room === 1 ? 'foto' : 'fotos'}; as demais ficaram de fora.`)
    const queue = valid.slice(0, Math.max(0, room))

    // One at a time, in the order chosen, so they land in that order.
    setProgress({ done: 0, total: queue.length })
    for (const [index, file] of queue.entries()) {
      try {
        await upload.mutateAsync(file)
      } catch (error) {
        found.push(uploadErrorMessage(error, file.name))
      }
      setProgress({ done: index + 1, total: queue.length })
    }
    setProgress(null)
    setProblems(found)
  }

  function move(index: number, to: number) {
    const ids = photos.map((photo) => photo.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(to, 0, moved!)
    reorder.mutate(ids)
  }

  const busy = progress !== null

  return (
    <section aria-labelledby="photos-title" className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="photos-title" className="font-semibold">
            Fotos
          </h2>
          <p className="text-sm text-muted-foreground">
            {photos.length} de {MAX_PHOTOS} · a primeira é a capa
          </p>
        </div>
        <FilePickerButton
          label={busy ? `Enviando ${progress.done + 1} de ${progress.total}…` : 'Adicionar fotos'}
          accept={PHOTO_TYPES}
          multiple
          disabled={busy || photos.length >= MAX_PHOTOS}
          onFiles={send}
        />
      </div>

      {problems.length > 0 && (
        <ul role="alert" className="mt-4 grid gap-1 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      {photos.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          <ImageIcon className="size-6" aria-hidden="true" />
          Nenhuma foto ainda. JPEG, PNG ou WebP, até 15 MB cada.
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, index) => {
            const label = `foto ${index + 1}`
            return (
              <li key={photo.id} className="group relative overflow-hidden rounded-xl border bg-muted">
                <a href={photo.contentUrl} target="_blank" rel="noreferrer" className="block aspect-4/3">
                  <img
                    src={photo.contentUrl}
                    alt={`${propertyName}, ${label}${index === 0 ? ' (capa)' : ''}`}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </a>
                {index === 0 && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-medium shadow-sm">
                    <Star className="size-3" aria-hidden="true" />
                    Capa
                  </span>
                )}
                <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1">
                  <div className="flex gap-1">
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      className="bg-card/95 shadow-sm"
                      aria-label={`Mover ${label} para a esquerda`}
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => move(index, index - 1)}
                    >
                      <ChevronLeft aria-hidden="true" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      className="bg-card/95 shadow-sm"
                      aria-label={`Mover ${label} para a direita`}
                      disabled={index === photos.length - 1 || reorder.isPending}
                      onClick={() => move(index, index + 1)}
                    >
                      <ChevronRight aria-hidden="true" />
                    </Button>
                    {index > 0 && (
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        className="bg-card/95 shadow-sm"
                        aria-label={`Usar ${label} como capa`}
                        title="Usar como capa"
                        disabled={reorder.isPending}
                        onClick={() => move(index, 0)}
                      >
                        <Star aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  {canDelete && (
                    <ConfirmDialog
                      trigger={
                        <Button variant="secondary" size="icon-sm" className="bg-card/95 text-destructive shadow-sm" aria-label={`Remover ${label}`}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      }
                      title="Remover esta foto?"
                      description="A foto sai do imóvel e o arquivo é apagado."
                      confirmLabel="Remover foto"
                      onConfirm={() => remove.mutateAsync(photo.id)}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
