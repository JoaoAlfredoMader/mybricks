import { describe, expect, it } from 'vitest'
import { checkOccupant, EMPTY_OCCUPANT, OCCUPANT_API_MESSAGES, OCCUPANT_PATH_TO_FIELD, toOccupantRequest, type OccupantValues } from './occupant-form'

function problems(values: OccupantValues) {
  const found: Record<string, string> = {}
  checkOccupant(values, (path, message) => (found[path] = message))
  return found
}

const person: OccupantValues = { ...EMPTY_OCCUPANT, occupantName: 'Rafael Lima' }

describe('checkOccupant', () => {
  it('needs only a name for a new person', () => {
    expect(problems(person)).toEqual({})
    expect(problems(EMPTY_OCCUPANT)).toEqual({ occupantName: 'Informe o nome (pelo menos 2 letras).' })
    expect(problems({ ...person, occupantName: ' R ' }).occupantName).toBe('Informe o nome (pelo menos 2 letras).')
  })

  it('accepts a CPF or a CNPJ typed with or without punctuation, and refuses another length', () => {
    expect(problems({ ...person, occupantDocument: '529.982.247-25' })).toEqual({})
    expect(problems({ ...person, occupantDocument: '52998224725' })).toEqual({})
    expect(problems({ ...person, occupantDocument: '11.222.333/0001-81' })).toEqual({})
    expect(problems({ ...person, occupantDocument: '123' }).occupantDocument).toBe('CPF com 11 dígitos ou CNPJ com 14.')
    expect(problems({ ...person, occupantDocument: '1'.repeat(12) }).occupantDocument).toBe('CPF com 11 dígitos ou CNPJ com 14.')
  })

  it('refuses an e-mail without an @ and a phone with too few or too many digits', () => {
    expect(problems({ ...person, occupantEmail: 'rafael-sem-arroba' }).occupantEmail).toBe('E-mail no formato nome@exemplo.com.')
    expect(problems({ ...person, occupantEmail: 'rafael@exemplo.com' })).toEqual({})
    expect(problems({ ...person, occupantPhone: '99' }).occupantPhone).toBe('Telefone com DDD, por exemplo (11) 98765-4321.')
    expect(problems({ ...person, occupantPhone: '1'.repeat(16) }).occupantPhone).toBe('Telefone com DDD, por exemplo (11) 98765-4321.')
    expect(problems({ ...person, occupantPhone: '(11) 98765-4321' })).toEqual({})
  })

  it('needs the person to be chosen when picking one on file, and checks nothing else then', () => {
    expect(problems({ ...EMPTY_OCCUPANT, occupantMode: 'existing' })).toEqual({ occupant: 'Escolha a pessoa, ou cadastre uma nova.' })
    expect(
      problems({ ...EMPTY_OCCUPANT, occupantMode: 'existing', occupant: { id: 'o-1', name: 'Marina', document: null, email: null, phone: null }, occupantDocument: '1' }),
    ).toEqual({})
  })
})

describe('toOccupantRequest', () => {
  it('sends the id of a person on file', () => {
    expect(toOccupantRequest({ ...EMPTY_OCCUPANT, occupantMode: 'existing', occupant: { id: 'o-1', name: 'Marina', document: null, email: null, phone: null } })).toEqual({
      occupantId: 'o-1',
    })
  })

  it('sends a new person with digits for the document and phone, and null for what is blank', () => {
    expect(toOccupantRequest({ ...person, occupantDocument: '529.982.247-25', occupantPhone: '(11) 98765-4321', occupantEmail: ' rafael@exemplo.com ' })).toEqual({
      occupant: { name: 'Rafael Lima', document: '52998224725', email: 'rafael@exemplo.com', phone: '11987654321' },
    })
    expect(toOccupantRequest(person)).toEqual({ occupant: { name: 'Rafael Lima', document: null, email: null, phone: null } })
  })
})

describe('what the API says about an occupant', () => {
  it('lands each request path on its field', () => {
    expect(OCCUPANT_PATH_TO_FIELD['occupant.document']).toBe('occupantDocument')
    expect(OCCUPANT_PATH_TO_FIELD.occupantId).toBe('occupant')
  })

  it('is said in Portuguese', () => {
    expect(OCCUPANT_API_MESSAGES['Invalid CPF or CNPJ']).toBe('CPF ou CNPJ inválido.')
    expect(OCCUPANT_API_MESSAGES['An occupant with this document already exists']).toContain('Já cadastrado')
  })
})
