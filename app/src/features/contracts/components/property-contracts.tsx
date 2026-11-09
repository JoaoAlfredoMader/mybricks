import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { formatMoney } from '@/lib/format'
import { contractsQueryOptions } from '../api/queries'
import { CONTRACT_TYPE_LABEL } from '../lib/labels'
import { contractPeriod } from '../lib/period'
import { ContractStatusBadge } from './contract-status-badge'

const SHOWN = 5

/** The property's latest contracts, on its page, with a way to add one. */
export function PropertyContracts({ propertyId }: { propertyId: string }) {
  const page = useQuery(contractsQueryOptions({ page: 1, propertyId }, SHOWN)).data
  const contracts = page?.items ?? []

  return (
    <section aria-labelledby="property-contracts-title" className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="property-contracts-title" className="font-semibold">
            Contratos
          </h2>
          <p className="text-sm text-muted-foreground">
            {page && page.total > SHOWN ? `Os ${SHOWN} mais recentes de ${page.total}.` : 'Do início mais recente para o mais antigo.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {page && page.total > 0 && (
            <Link
              to="/app/contratos"
              search={{ propertyId }}
              className={buttonVariants({ variant: 'ghost', size: 'lg', className: 'h-10 px-4' })}
            >
              Ver todos
            </Link>
          )}
          <Link
            to="/app/contratos/novo"
            search={{ propertyId }}
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10 px-5' })}
          >
            <Plus aria-hidden="true" />
            Novo contrato
          </Link>
        </div>
      </div>

      {page && contracts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          Nenhum contrato ainda.
        </p>
      ) : (
        <ul className="mt-4 divide-y rounded-xl border">
          {contracts.map((contract) => (
            <li key={contract.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <div className="min-w-0">
                <Link
                  to="/app/contratos/$contractId"
                  params={{ contractId: contract.id }}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {contract.occupant.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {CONTRACT_TYPE_LABEL[contract.contractType]} · {contractPeriod(contract)}
                  {contract.rentTerms && ` · ${formatMoney(contract.rentTerms.monthlyRentCents)}/mês`}
                </p>
              </div>
              <ContractStatusBadge status={contract.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
