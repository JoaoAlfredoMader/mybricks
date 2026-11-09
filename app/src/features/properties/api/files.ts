import { queryOptions } from '@tanstack/react-query'
import { ApiError, api, type Schemas, unwrap } from '@/lib/api/client'

export type Photo = Schemas['Photo']
export type PropertyDocument = Schemas['Document']

export function photosQueryOptions(propertyId: string) {
  return queryOptions({
    queryKey: ['properties', 'photos', propertyId],
    queryFn: () => unwrap(api.GET('/api/properties/{propertyId}/photos', { params: { path: { propertyId } } })),
  })
}

export function documentsQueryOptions(propertyId: string) {
  return queryOptions({
    queryKey: ['properties', 'documents', propertyId],
    queryFn: () => unwrap(api.GET('/api/properties/{propertyId}/documents', { params: { path: { propertyId } } })),
  })
}

/** What the API accepts, checked here first so a wrong file never travels. */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
/** The API's default MAX_UPLOAD_MB; it still has the last word (413). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
export const MAX_PHOTOS = 30

/** Why a file cannot be sent, or null when it can. */
export function fileProblem(file: File, accepted: string[], kind: 'foto' | 'documento'): string | null {
  if (file.size === 0) return `"${file.name}" está vazio.`
  if (!accepted.includes(file.type)) {
    return kind === 'foto'
      ? `"${file.name}" não é JPEG, PNG ou WebP.`
      : `"${file.name}" não é PDF, imagem, DOCX ou XLSX.`
  }
  if (file.size > MAX_UPLOAD_BYTES) return `"${file.name}" passa de 15 MB.`
  return null
}

/** The API's answer to a failed upload, in Portuguese. */
export function uploadErrorMessage(error: unknown, fileName: string): string {
  if (!(error instanceof ApiError)) return `Não foi possível enviar "${fileName}". Verifique a conexão.`
  switch (error.code) {
    case 'PAYLOAD_TOO_LARGE':
      return `"${fileName}" é grande demais para a API.`
    case 'UNSUPPORTED_MEDIA_TYPE':
      return `"${fileName}" não é do tipo que diz ser.`
    case 'BUSINESS_RULE_VIOLATION':
      return `Este imóvel já tem ${MAX_PHOTOS} fotos, o máximo.`
    default:
      return `A API recusou "${fileName}".`
  }
}

function formData(fields: Record<string, string | Blob>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.append(name, value)
  return data
}

/** Multipart goes as is: the browser sets the boundary. */
const asFormData = (body: unknown) => body as FormData

export function uploadPhoto(propertyId: string, file: File) {
  return unwrap(
    api.POST('/api/properties/{propertyId}/photos', {
      params: { path: { propertyId } },
      body: formData({ file }) as unknown as { file: string },
      bodySerializer: asFormData,
    }),
  )
}

export function uploadDocument(propertyId: string, file: File, category: string | null) {
  return unwrap(
    api.POST('/api/properties/{propertyId}/documents', {
      params: { path: { propertyId } },
      body: formData(category ? { file, category } : { file }) as unknown as { file: string },
      bodySerializer: asFormData,
    }),
  )
}

export function reorderPhotos(propertyId: string, photoIds: string[]) {
  return unwrap(api.PUT('/api/properties/{propertyId}/photos/order', { params: { path: { propertyId } }, body: { photoIds } }))
}

export function deletePhoto(propertyId: string, id: string) {
  return unwrap(api.DELETE('/api/properties/{propertyId}/photos/{id}', { params: { path: { propertyId, id } } }))
}

export function updateDocumentCategory(propertyId: string, id: string, category: string | null) {
  return unwrap(
    api.PATCH('/api/properties/{propertyId}/documents/{id}', { params: { path: { propertyId, id } }, body: { category } }),
  )
}

export function deleteDocument(propertyId: string, id: string) {
  return unwrap(api.DELETE('/api/properties/{propertyId}/documents/{id}', { params: { path: { propertyId, id } } }))
}
