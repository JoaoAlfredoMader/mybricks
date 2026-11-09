import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { makeClient } from '@/test/fake-api'
import {
  apiMessageInPortuguese,
  clientErrorMessage,
  clientFormSchema,
  EMPTY_CLIENT_FORM,
  fromClient,
  toClientRequest,
  type ClientFormValues,
} from './client-form'

const valid: ClientFormValues = { ...EMPTY_CLIENT_FORM, name: 'Ana Souza' }

function problems(values: ClientFormValues) {
  const result = clientFormSchema.safeParse(values)
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]))
}

const apiError = (status: number, message: string, details?: unknown) =>
  new ApiError(status, { code: 'CONFLICT', message, details } as never)

describe('client form values', () => {
  it('writes a stored client with its document and phone formatted', () => {
    expect(fromClient(makeClient())).toEqual({
      name: 'Marina Prado',
      personType: 'individual',
      document: '529.982.247-25',
      email: 'marina@example.com',
      whatsapp: '(11) 98765-4321',
    })
  })

  it('leaves what a client does not have blank', () => {
    expect(fromClient(makeClient({ document: null, email: null, whatsapp: null }))).toMatchObject({ document: '', email: '', whatsapp: '' })
  })
})

describe('client form checks', () => {
  it('needs only a name', () => {
    expect(problems(valid)).toEqual({})
    expect(problems(EMPTY_CLIENT_FORM)).toEqual({ name: 'Informe o nome (pelo menos 2 letras).' })
    expect(problems({ ...valid, name: ' A ' }).name).toBe('Informe o nome (pelo menos 2 letras).')
  })

  it('asks for as many digits as the kind of person has in its document', () => {
    expect(problems({ ...valid, document: '529.982.247-25' })).toEqual({})
    expect(problems({ ...valid, document: '529.982.247' }).document).toBe('CPF com 11 dígitos.')
    expect(problems({ ...valid, personType: 'company', document: '529.982.247-25' }).document).toBe('CNPJ com 14 dígitos.')
    expect(problems({ ...valid, personType: 'company', document: '11.222.333/0001-81' })).toEqual({})
  })

  it('refuses an e-mail without an @ and a WhatsApp number too short or too long', () => {
    expect(problems({ ...valid, email: 'ana-sem-arroba' }).email).toBe('E-mail no formato nome@exemplo.com.')
    expect(problems({ ...valid, email: 'ana@exemplo.com.br' })).toEqual({})
    expect(problems({ ...valid, whatsapp: '99' }).whatsapp).toBe('WhatsApp com DDD, por exemplo (11) 98765-4321.')
    expect(problems({ ...valid, whatsapp: '1'.repeat(16) }).whatsapp).toBe('WhatsApp com DDD, por exemplo (11) 98765-4321.')
    expect(problems({ ...valid, whatsapp: '(21) 98888-7777' })).toEqual({})
  })
})

describe('client request', () => {
  it('sends digits for the document and phone, and null for what is blank', () => {
    expect(toClientRequest({ ...valid, document: '529.982.247-25', whatsapp: '(21) 98888-7777', email: ' ana@exemplo.com.br ' })).toEqual({
      name: 'Ana Souza',
      personType: 'individual',
      document: '52998224725',
      email: 'ana@exemplo.com.br',
      whatsapp: '21988887777',
    })
    expect(toClientRequest(valid)).toEqual({ name: 'Ana Souza', personType: 'individual', document: null, email: null, whatsapp: null })
  })
})

describe('client error messages', () => {
  it('says the API refusals in Portuguese', () => {
    expect(apiMessageInPortuguese('Invalid CPF')).toBe('CPF inválido.')
    expect(apiMessageInPortuguese('Invalid CNPJ')).toBe('CNPJ inválido.')
    expect(apiMessageInPortuguese('Enter the phone number with area code')).toBe('Informe o WhatsApp com DDD.')
    expect(apiMessageInPortuguese('Something new')).toBe('A API recusou este valor. Revise e tente de novo.')
  })

  it('says how many properties keep a client from being deleted', () => {
    expect(clientErrorMessage(apiError(409, 'Client still has properties', { properties: 1 }))).toBe(
      'Este cliente ainda é dono de 1 imóvel. Passe-os para outro cliente ou exclua-os antes.',
    )
    expect(clientErrorMessage(apiError(409, 'Client still has properties', { properties: 3 }))).toContain('dono de 3 imóveis')
  })

  it('explains a delete blocked while impersonating, a known refusal, and anything else', () => {
    expect(clientErrorMessage(apiError(403, 'Forbidden'))).toBe('Exclusões ficam bloqueadas enquanto você vê o sistema como outra pessoa.')
    expect(clientErrorMessage(apiError(404, 'Client not found'))).toBe('Este cliente não existe mais.')
    expect(clientErrorMessage(apiError(409, 'Client still has properties', { properties: 'muitos' }))).toContain('Não foi possível salvar agora')
    expect(clientErrorMessage(apiError(409, 'Other'))).toContain('Não foi possível salvar agora')
    expect(clientErrorMessage(new Error('offline'), 'Outro texto')).toBe('Outro texto')
  })
})
