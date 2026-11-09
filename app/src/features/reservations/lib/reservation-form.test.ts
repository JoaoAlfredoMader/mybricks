import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { makeReservation } from '@/test/fake-api'
import {
  apiMessageInPortuguese,
  editReservationSchema,
  emptyNewReservation,
  fromReservation,
  newReservationSchema,
  reservationErrorMessage,
  toCreateRequest,
  toUpdateRequest,
  type EditReservationValues,
  type NewReservationValues,
} from './reservation-form'

const valid: NewReservationValues = {
  ...emptyNewReservation('property-1'),
  occupantName: 'Hóspede Teste',
  checkIn: '20/11/2026',
  checkOut: '22/11/2026',
}

function problems(schema: typeof newReservationSchema | typeof editReservationSchema, values: NewReservationValues | EditReservationValues) {
  const result = schema.safeParse(values)
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]))
}

const apiError = (status: number, message: string, details?: unknown) =>
  new ApiError(status, { code: 'CONFLICT', message, details } as never)

describe('reservation form values', () => {
  it('starts empty, from the property it was opened on', () => {
    expect(emptyNewReservation('p1')).toMatchObject({ propertyId: 'p1', checkIn: '', totalAmount: '', contractId: '', occupantMode: 'new' })
    expect(emptyNewReservation().propertyId).toBe('')
  })

  it('writes a stored reservation the way people type it', () => {
    expect(fromReservation(makeReservation({ notes: null, contractId: null, totalAmountCents: 0 }))).toEqual({
      checkIn: '22/11/2026',
      checkOut: '27/11/2026',
      totalAmount: '0,00',
      contractId: '',
      notes: '',
    })
    expect(fromReservation(makeReservation({ contractId: 'c1', notes: 'Chega à noite' }))).toMatchObject({ contractId: 'c1', notes: 'Chega à noite' })
  })
})

describe('reservation form checks', () => {
  it('accepts a stay with a new guest, and a blank total', () => {
    expect(problems(newReservationSchema, valid)).toEqual({})
  })

  it('asks for the property, the guest and both dates', () => {
    expect(problems(newReservationSchema, emptyNewReservation())).toEqual({
      propertyId: 'Escolha o imóvel.',
      occupantName: 'Informe o nome (pelo menos 2 letras).',
      checkIn: 'Informe a entrada.',
      checkOut: 'Informe a saída.',
    })
  })

  it('refuses a date that does not exist, and a check-out that is not after the check-in', () => {
    expect(problems(newReservationSchema, { ...valid, checkIn: '32/11/2026' }).checkIn).toBe('Data no formato dd/mm/aaaa.')
    expect(problems(newReservationSchema, { ...valid, checkOut: 'amanhã' }).checkOut).toBe('Data no formato dd/mm/aaaa.')
    expect(problems(newReservationSchema, { ...valid, checkOut: '20/11/2026' }).checkOut).toBe('A saída precisa ser depois da entrada.')
    expect(problems(newReservationSchema, { ...valid, checkOut: '19/11/2026' }).checkOut).toBe('A saída precisa ser depois da entrada.')
  })

  it('refuses a total that is not money, or negative', () => {
    const message = 'Valor em reais, por exemplo 1.850,00.'
    expect(problems(newReservationSchema, { ...valid, totalAmount: 'caro' }).totalAmount).toBe(message)
    expect(problems(newReservationSchema, { ...valid, totalAmount: '-1,00' }).totalAmount).toBe(message)
    expect(problems(newReservationSchema, { ...valid, totalAmount: '0' })).toEqual({})
  })

  it('checks the stay alone when editing (the property and the guest are fixed)', () => {
    const edit: EditReservationValues = { checkIn: '20/11/2026', checkOut: '22/11/2026', totalAmount: '', contractId: '', notes: '' }
    expect(problems(editReservationSchema, edit)).toEqual({})
    expect(problems(editReservationSchema, { ...edit, checkOut: '' }).checkOut).toBe('Informe a saída.')
  })
})

describe('reservation requests', () => {
  it('creates with a new guest, a blank total as zero and no contract', () => {
    expect(toCreateRequest(valid)).toEqual({
      propertyId: 'property-1',
      checkIn: '2026-11-20',
      checkOut: '2026-11-22',
      totalAmountCents: 0,
      contractId: null,
      notes: null,
      occupant: { name: 'Hóspede Teste', document: null, email: null, phone: null },
    })
  })

  it('creates with a guest on file and a contract', () => {
    const request = toCreateRequest({
      ...valid,
      occupantMode: 'existing',
      occupant: { id: 'o-1', name: 'Marina', document: null, email: null, phone: null },
      contractId: 'c-1',
      totalAmount: '1.800,00',
      notes: ' Chega à noite ',
    })
    expect(request).toMatchObject({ occupantId: 'o-1', contractId: 'c-1', totalAmountCents: 180_000, notes: 'Chega à noite' })
    expect(request).not.toHaveProperty('occupant')
  })

  it('updates the total and the notes always, and the dates and the contract only when they changed', () => {
    const initial: EditReservationValues = { checkIn: '20/11/2026', checkOut: '22/11/2026', totalAmount: '1.000,00', contractId: 'c-1', notes: '' }
    expect(toUpdateRequest(initial, initial)).toEqual({ totalAmountCents: 100_000, notes: null })
    expect(toUpdateRequest({ ...initial, checkOut: '25/11/2026' }, initial)).toEqual({ totalAmountCents: 100_000, notes: null, checkOut: '2026-11-25' })
    expect(toUpdateRequest({ ...initial, checkIn: '19/11/2026' }, initial)).toMatchObject({ checkIn: '2026-11-19' })
    expect(toUpdateRequest({ ...initial, contractId: '' }, initial)).toMatchObject({ contractId: null })
    expect(toUpdateRequest({ ...initial, contractId: 'c-2', totalAmount: '' }, initial)).toMatchObject({ contractId: 'c-2', totalAmountCents: 0 })
  })
})

describe('reservation error messages', () => {
  it('says the API refusals in Portuguese', () => {
    expect(apiMessageInPortuguese('The contract is not active')).toBe('Este contrato não está mais ativo.')
    expect(apiMessageInPortuguese('Only confirmed reservations can be cancelled')).toBe('Só reservas confirmadas podem ser canceladas.')
    expect(apiMessageInPortuguese('Occupant not found')).toBe('Esta pessoa não está mais cadastrada.')
    expect(apiMessageInPortuguese('Something new')).toBe('A API recusou este valor. Revise e tente de novo.')
  })

  it('names the stay in the way when two stays share a night', () => {
    const message = reservationErrorMessage(
      apiError(409, 'The property already has a confirmed reservation in these dates', { reservationId: 'r1', checkIn: '2026-11-22', checkOut: '2026-11-27' }),
    )
    expect(message).toContain('de 22/11/2026 a 27/11/2026')
    expect(message).toContain('no mesmo dia da entrada da seguinte')
  })

  it('does not invent a stay when the 409 says nothing about one', () => {
    expect(reservationErrorMessage(apiError(409, 'Something else', { other: 1 }))).toContain('Não foi possível salvar agora')
    expect(reservationErrorMessage(apiError(409, 'Something else', 'text'))).toContain('Não foi possível salvar agora')
    expect(reservationErrorMessage(apiError(409, 'Something else'))).toContain('Não foi possível salvar agora')
  })

  it('uses a known refusal, the fallback for the unknown, and a custom fallback', () => {
    expect(reservationErrorMessage(apiError(422, 'Only confirmed reservations can be changed'))).toBe('Só reservas confirmadas podem ser alteradas.')
    expect(reservationErrorMessage(apiError(500, 'boom'))).toContain('Verifique a conexão')
    expect(reservationErrorMessage(new Error('offline'))).toContain('Verifique a conexão')
    expect(reservationErrorMessage(new Error('offline'), 'Outro texto')).toBe('Outro texto')
  })
})
