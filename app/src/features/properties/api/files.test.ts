import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { DOCUMENT_TYPES, fileProblem, MAX_UPLOAD_BYTES, PHOTO_TYPES, uploadErrorMessage } from './files'

const file = (name: string, type: string, size = 100) => new File([new Uint8Array(size)], name, { type })
const apiError = (code: string) => new ApiError(400, { code, message: 'x' } as never)

describe('fileProblem', () => {
  it('lets a photo of an accepted type through, and a document of any of its types', () => {
    expect(fileProblem(file('sala.jpg', 'image/jpeg'), PHOTO_TYPES, 'foto')).toBeNull()
    expect(fileProblem(file('capa.webp', 'image/webp'), PHOTO_TYPES, 'foto')).toBeNull()
    expect(fileProblem(file('escritura.pdf', 'application/pdf'), DOCUMENT_TYPES, 'documento')).toBeNull()
    expect(fileProblem(file('planilha.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), DOCUMENT_TYPES, 'documento')).toBeNull()
  })

  it('refuses an empty file, a wrong type and a file over 15 MB, saying which', () => {
    expect(fileProblem(file('vazio.png', 'image/png', 0), PHOTO_TYPES, 'foto')).toBe('"vazio.png" está vazio.')
    expect(fileProblem(file('planta.pdf', 'application/pdf'), PHOTO_TYPES, 'foto')).toBe('"planta.pdf" não é JPEG, PNG ou WebP.')
    expect(fileProblem(file('notas.txt', 'text/plain'), DOCUMENT_TYPES, 'documento')).toBe('"notas.txt" não é PDF, imagem, DOCX ou XLSX.')
    expect(fileProblem(file('enorme.png', 'image/png', MAX_UPLOAD_BYTES + 1), PHOTO_TYPES, 'foto')).toBe('"enorme.png" passa de 15 MB.')
    expect(fileProblem(file('limite.png', 'image/png', MAX_UPLOAD_BYTES), PHOTO_TYPES, 'foto')).toBeNull()
  })
})

describe('uploadErrorMessage', () => {
  it('translates what the API says about a failed upload', () => {
    expect(uploadErrorMessage(apiError('PAYLOAD_TOO_LARGE'), 'a.png')).toBe('"a.png" é grande demais para a API.')
    expect(uploadErrorMessage(apiError('UNSUPPORTED_MEDIA_TYPE'), 'a.png')).toBe('"a.png" não é do tipo que diz ser.')
    expect(uploadErrorMessage(apiError('BUSINESS_RULE_VIOLATION'), 'a.png')).toBe('Este imóvel já tem 30 fotos, o máximo.')
    expect(uploadErrorMessage(apiError('SOMETHING_ELSE'), 'a.png')).toBe('A API recusou "a.png".')
  })

  it('blames the connection when the API did not answer at all', () => {
    expect(uploadErrorMessage(new TypeError('Failed to fetch'), 'a.png')).toBe('Não foi possível enviar "a.png". Verifique a conexão.')
  })
})
