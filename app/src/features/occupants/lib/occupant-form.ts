import type { Issue } from '@/lib/form-issues'
import type { Occupant } from '../api/queries'

/**
 * The tenant or guest part of a form, shared by contracts and reservations. Like every form
 * here it keeps what is typed as text and converts it only when the request is built.
 */
export interface OccupantValues {
  occupantMode: 'existing' | 'new'
  occupant: Occupant | null
  occupantName: string
  occupantDocument: string
  occupantEmail: string
  occupantPhone: string
}

export const EMPTY_OCCUPANT: OccupantValues = {
  occupantMode: 'new',
  occupant: null,
  occupantName: '',
  occupantDocument: '',
  occupantEmail: '',
  occupantPhone: '',
}

const digits = (text: string) => text.replace(/\D/g, '')
const orNull = (text: string) => text.trim() || null
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Reports what is wrong with the occupant fields, in Portuguese, through `issue`. */
export function checkOccupant(values: OccupantValues, issue: Issue) {
  if (values.occupantMode === 'existing') {
    if (!values.occupant) issue('occupant', 'Escolha a pessoa, ou cadastre uma nova.')
    return
  }
  if (values.occupantName.trim().length < 2) issue('occupantName', 'Informe o nome (pelo menos 2 letras).')
  const document = digits(values.occupantDocument)
  if (values.occupantDocument.trim() && document.length !== 11 && document.length !== 14) {
    issue('occupantDocument', 'CPF com 11 dígitos ou CNPJ com 14.')
  }
  if (values.occupantEmail.trim() && !EMAIL.test(values.occupantEmail.trim())) {
    issue('occupantEmail', 'E-mail no formato nome@exemplo.com.')
  }
  const phone = digits(values.occupantPhone)
  if (values.occupantPhone.trim() && (phone.length < 10 || phone.length > 15)) {
    issue('occupantPhone', 'Telefone com DDD, por exemplo (11) 98765-4321.')
  }
}

/** Either the id of the occupant on file, or the new one; only call with values `checkOccupant` accepted. */
export function toOccupantRequest(values: OccupantValues) {
  if (values.occupantMode === 'existing') return { occupantId: values.occupant!.id }
  return {
    occupant: {
      name: values.occupantName.trim(),
      document: orNull(digits(values.occupantDocument)),
      email: orNull(values.occupantEmail),
      phone: orNull(digits(values.occupantPhone)),
    },
  }
}

/** Where the API's occupant errors land in the form. */
export const OCCUPANT_PATH_TO_FIELD: Record<string, keyof OccupantValues> = {
  occupantId: 'occupant',
  'occupant.name': 'occupantName',
  'occupant.document': 'occupantDocument',
  'occupant.email': 'occupantEmail',
  'occupant.phone': 'occupantPhone',
}

/** What the API says about an occupant, in Portuguese. */
export const OCCUPANT_API_MESSAGES: Record<string, string> = {
  'Invalid CPF or CNPJ': 'CPF ou CNPJ inválido.',
  'Enter the phone number with area code': 'Informe o telefone com DDD.',
  'Occupant not found': 'Esta pessoa não está mais cadastrada.',
  'Send either occupantId or occupant': 'Escolha uma pessoa cadastrada ou cadastre uma nova.',
  'An occupant with this document already exists': 'Já existe uma pessoa com este documento. Escolha-a em "Já cadastrado".',
}
