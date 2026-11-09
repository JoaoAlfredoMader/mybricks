import { DOCUMENT_TYPOGRAPHY } from './document-typography'

interface ContractDocumentProps {
  /** Cleaned HTML with the tokens already filled in. */
  header: string
  clauses: string
  footer: string
}

/** The contract as a page: the header on top, the clauses, and the footer under a rule. */
export function ContractDocument({ header, clauses, footer }: ContractDocumentProps) {
  return (
    <article
      aria-label="Prévia do contrato"
      className="mx-auto max-w-2xl rounded-2xl border bg-card px-6 py-8 text-sm leading-relaxed shadow-sm sm:px-10 sm:py-10"
    >
      {header && <header className={`text-center ${DOCUMENT_TYPOGRAPHY}`} dangerouslySetInnerHTML={{ __html: header }} />}
      <div className={DOCUMENT_TYPOGRAPHY} dangerouslySetInnerHTML={{ __html: clauses }} />
      {footer && (
        <footer
          className={`mt-8 border-t pt-4 text-xs text-muted-foreground ${DOCUMENT_TYPOGRAPHY}`}
          dangerouslySetInnerHTML={{ __html: footer }}
        />
      )}
    </article>
  )
}
