import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { makeContract } from '@/test/fake-api'
import {
  apiMessageInPortuguese,
  contractErrorMessage,
  editContractSchema,
  emptyNewContract,
  fromContract,
  newContractSchema,
  toCreateRequest,
  toUpdateRequest,
  type EditContractValues,
  type NewContractValues,
} from './contract-form'

const valid: NewContractValues = {
  ...emptyNewContract('property-1'),
  occupantName: 'Rafael Lima',
  startDate: '01/12/2026',
  monthlyRent: '1.350,00',
  dueDay: '10',
}

/** `type` is what the chosen property takes; 'unknown' is a property the form does not know (yet). */
function problems(values: NewContractValues, type: 'conventional' | 'short_stay' | 'unknown' = 'conventional') {
  const result = newContractSchema(() => (type === 'unknown' ? undefined : type)).safeParse(values)
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]))
}

const apiError = (status: number, message: string) => new ApiError(status, { code: 'BUSINESS_RULE_VIOLATION', message } as never)

describe('contract form values', () => {
  it('starts empty, from the property it was opened on', () => {
    expect(emptyNewContract('p1')).toMatchObject({ propertyId: 'p1', startDate: '', monthlyRent: '', dueDay: '', adjustmentIndex: '', occupantMode: 'new' })
    expect(emptyNewContract().propertyId).toBe('')
  })

  it('writes a stored contract the way people type it', () => {
    expect(fromContract(makeContract({ notes: null, endDate: null }))).toEqual({
      endDate: '',
      notes: '',
      monthlyRent: '3.800,00',
      dueDay: '5',
      adjustmentIndex: 'igpm',
    })
  })

  it('leaves the rent blank for a short-stay contract, which has none', () => {
    expect(fromContract(makeContract({ rentTerms: null, contractType: 'short_stay' }))).toMatchObject({ monthlyRent: '', dueDay: '', adjustmentIndex: '' })
  })
})

describe('new contract checks', () => {
  it('accepts a complete conventional contract', () => {
    expect(problems(valid)).toEqual({})
  })

  it('asks for the property, the occupant, the start and the rent terms', () => {
    expect(problems(emptyNewContract())).toEqual({
      propertyId: 'Escolha o imóvel.',
      occupantName: 'Informe o nome (pelo menos 2 letras).',
      startDate: 'Informe o início.',
      monthlyRent: 'Informe o aluguel mensal.',
      dueDay: 'Informe o dia do vencimento.',
    })
  })

  it('does not ask for rent on a short-stay contract, nor before it knows the property', () => {
    expect(problems({ ...valid, monthlyRent: '', dueDay: '' }, 'short_stay')).toEqual({})
    expect(problems({ ...valid, monthlyRent: '', dueDay: '' }, 'unknown')).toEqual({})
  })

  it('refuses dates that do not exist and an end that is not after the start', () => {
    expect(problems({ ...valid, startDate: '31/02/2026' }).startDate).toBe('Data no formato dd/mm/aaaa.')
    expect(problems({ ...valid, endDate: 'um dia' }).endDate).toBe('Data no formato dd/mm/aaaa.')
    expect(problems({ ...valid, endDate: '01/12/2026' }).endDate).toBe('O fim precisa ser depois do início.')
    expect(problems({ ...valid, endDate: '30/11/2026' }).endDate).toBe('O fim precisa ser depois do início.')
    expect(problems({ ...valid, endDate: '02/12/2026' })).toEqual({})
  })

  it('refuses a rent that is not money and a due day outside the month', () => {
    const rent = 'Valor em reais, por exemplo 1.850,00.'
    expect(problems({ ...valid, monthlyRent: 'caro' }).monthlyRent).toBe(rent)
    expect(problems({ ...valid, monthlyRent: '0' }).monthlyRent).toBe(rent)
    expect(problems({ ...valid, dueDay: '0' }).dueDay).toBe('Um dia entre 1 e 31.')
    expect(problems({ ...valid, dueDay: '32' }).dueDay).toBe('Um dia entre 1 e 31.')
    expect(problems({ ...valid, dueDay: '10,5' }).dueDay).toBe('Um dia entre 1 e 31.')
    expect(problems({ ...valid, dueDay: '31' })).toEqual({})
  })
})

describe('edit contract checks', () => {
  const edit: EditContractValues = { endDate: '', notes: '', monthlyRent: '1.350,00', dueDay: '10', adjustmentIndex: '' }
  const check = (values: EditContractValues, contract = { contractType: 'conventional' as const, startDate: '2026-12-01' }) => {
    const result = editContractSchema(contract).safeParse(values)
    return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]))
  }

  it('checks the end against the start already stored, and the rent of a conventional contract', () => {
    expect(check(edit)).toEqual({})
    expect(check({ ...edit, endDate: '01/12/2026' }).endDate).toBe('O fim precisa ser depois do início.')
    expect(check({ ...edit, monthlyRent: '', dueDay: '' })).toEqual({ monthlyRent: 'Informe o aluguel mensal.', dueDay: 'Informe o dia do vencimento.' })
  })

  it('leaves the rent alone on a short-stay contract', () => {
    expect(check({ ...edit, monthlyRent: '', dueDay: '' }, { contractType: 'short_stay' as never, startDate: '2026-12-01' })).toEqual({})
  })
})

describe('contract requests', () => {
  it('creates a conventional contract with its rent terms and a new occupant', () => {
    expect(toCreateRequest({ ...valid, endDate: '30/11/2027', adjustmentIndex: 'ipca', notes: ' ok ' }, 'conventional')).toEqual({
      propertyId: 'property-1',
      contractType: 'conventional',
      startDate: '2026-12-01',
      endDate: '2027-11-30',
      notes: 'ok',
      occupant: { name: 'Rafael Lima', document: null, email: null, phone: null },
      rentTerms: { monthlyRentCents: 135_000, dueDay: 10, adjustmentIndex: 'ipca' },
    })
  })

  it('creates a short-stay contract with no rent terms and an occupant on file', () => {
    const request = toCreateRequest(
      { ...valid, occupantMode: 'existing', occupant: { id: 'o-1', name: 'Marina', document: null, email: null, phone: null } },
      'short_stay',
    )
    expect(request).toMatchObject({ contractType: 'short_stay', occupantId: 'o-1', rentTerms: null, endDate: null, notes: null })
  })

  it('updates every editable field, with null for a cleared end, and rent terms only for a conventional contract', () => {
    const values: EditContractValues = { endDate: '', notes: '', monthlyRent: '2.000,00', dueDay: '5', adjustmentIndex: '' }
    expect(toUpdateRequest(values, 'conventional')).toEqual({
      endDate: null,
      notes: null,
      rentTerms: { monthlyRentCents: 200_000, dueDay: 5, adjustmentIndex: null },
    })
    expect(toUpdateRequest({ ...values, endDate: '31/12/2027' }, 'short_stay')).toEqual({ endDate: '2027-12-31', notes: null })
  })
})

describe('contract error messages', () => {
  it('says the API refusals in Portuguese', () => {
    expect(apiMessageInPortuguese('Only active contracts can be changed')).toBe('Só contratos ativos podem ser alterados.')
    expect(apiMessageInPortuguese('Switch the property to contract rental mode before creating contracts')).toContain('Do contrato ativo')
    expect(apiMessageInPortuguese('Invalid CPF or CNPJ')).toBe('CPF ou CNPJ inválido.')
    expect(apiMessageInPortuguese('Something new')).toBe('A API recusou este valor. Revise e tente de novo.')
  })

  it('uses a known refusal, the fallback for the unknown, and a custom fallback', () => {
    expect(contractErrorMessage(apiError(422, 'Only conventional contracts have a PDF'))).toBe('Só contratos de locação têm PDF.')
    expect(contractErrorMessage(apiError(500, 'boom'))).toContain('Verifique a conexão')
    expect(contractErrorMessage(new Error('offline'), 'Outro texto')).toBe('Outro texto')
  })
})
