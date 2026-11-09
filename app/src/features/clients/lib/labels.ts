import type { PersonType } from '../api/queries'

export const PERSON_TYPE_LABEL: Record<PersonType, string> = {
  individual: 'Pessoa física',
  company: 'Pessoa jurídica',
}

/** The document an individual or a company is identified by. */
export const DOCUMENT_LABEL: Record<PersonType, string> = {
  individual: 'CPF',
  company: 'CNPJ',
}

/** How many digits that document has once the punctuation is gone. */
export const DOCUMENT_DIGITS: Record<PersonType, number> = {
  individual: 11,
  company: 14,
}
