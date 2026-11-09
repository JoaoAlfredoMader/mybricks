import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { formatNumericDate } from '@/lib/format'
import { transactionsQueryOptions } from '../api/queries'
import { recurrence, signedAmount } from '../lib/labels'
import { TransactionTypeBadge } from './transaction-type-badge'

const SHOWN = 5

/** The property's latest transactions, on its page, with a way to add one. */
export function PropertyTransactions({ propertyId }: { propertyId: string }) {
  const page = useQuery(transactionsQueryOptions({ page: 1, propertyId }, SHOWN)).data
  const transactions = page?.items ?? []

  return (
    <section aria-labelledby="property-transactions-title" className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="property-transactions-title" className="font-semibold">
            Lançamentos
          </h2>
          <p className="text-sm text-muted-foreground">
            {page && page.total > SHOWN ? `Os ${SHOWN} mais recentes de ${page.total}.` : 'Receitas e despesas fora da rotina. Entram na TIR.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {page && page.total > 0 && (
            <Link
              to="/app/financas"
              search={{ propertyId }}
              className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'h-10 px-4' })}
            >
              Ver todos
            </Link>
          )}
          <Link
            to="/app/financas/novo"
            search={{ propertyId }}
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10 px-5' })}
          >
            <Plus aria-hidden="true" />
            Novo lançamento
          </Link>
        </div>
      </div>

      {page && transactions.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          Nenhum lançamento ainda.
        </p>
      ) : (
        <ul className="mt-4 divide-y rounded-xl border">
          {transactions.map((transaction) => (
            <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <div className="min-w-0">
                <Link
                  to="/app/financas/$transactionId/editar"
                  params={{ transactionId: transaction.id }}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {transaction.categoryName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatNumericDate(transaction.occurredOn)} · {recurrence(transaction)}
                  {transaction.description && ` · ${transaction.description}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <TransactionTypeBadge type={transaction.type} />
                <span className="font-medium whitespace-nowrap tabular-nums">{signedAmount(transaction)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
