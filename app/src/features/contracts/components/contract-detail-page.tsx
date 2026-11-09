import { Link } from '@tanstack/react-router'
import { ArrowLeft, Ban, Download, FileText, Pencil, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DetailCard } from '@/components/detail-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatDate, formatDocument, formatMoney, formatPhone } from '@/lib/format'
import type { Contract } from '../api/queries'
import { useCancelContract, useGenerateContractPdf } from '../hooks/use-contract-mutations'
import { contractErrorMessage } from '../lib/contract-form'
import { ADJUSTMENT_INDEX_LABEL, CONTRACT_TYPE_LABEL } from '../lib/labels'
import { ContractStatusBadge } from './contract-status-badge'
import { EndContractDialog } from './end-contract-dialog'

function CancelContractButton({ contract }: { contract: Contract }) {
  const cancel = useCancelContract(contract.id)
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="lg" className="h-10 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Ban aria-hidden="true" />
          Cancelar contrato
        </Button>
      }
      title="Cancelar este contrato?"
      description="Use quando o contrato não chegou a valer. Ele fica registrado como cancelado e não volta a ficar ativo; para um contrato que valeu e terminou, use Encerrar."
      confirmLabel="Cancelar contrato"
      pendingLabel="Cancelando…"
      cancelLabel="Voltar"
      onConfirm={() => cancel.mutateAsync()}
      errorMessage={(error) => contractErrorMessage(error, 'Não foi possível cancelar agora. Tente de novo.')}
    />
  )
}

/** The contract filled into the organization's template, for conventional contracts. */
function ContractPdf({ contract }: { contract: Contract }) {
  const generate = useGenerateContractPdf(contract.id)
  const [problem, setProblem] = useState<string | null>(null)

  async function run() {
    setProblem(null)
    try {
      await generate.mutateAsync()
    } catch (error) {
      setProblem(contractErrorMessage(error, 'Não foi possível gerar o PDF agora. Tente de novo.'))
    }
  }

  return (
    <section aria-labelledby="contract-pdf-title" className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 id="contract-pdf-title" className="font-semibold">
        Documento
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {contract.pdfUrl
          ? 'O PDF usa o modelo de contrato da organização. Gere de novo depois de mudar o contrato ou o modelo.'
          : 'Gera o contrato em PDF a partir do modelo da organização, com os dados deste contrato.'}{' '}
        <Link to="/app/contratos/modelo" className="font-medium text-foreground underline underline-offset-4">
          Editar o modelo
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {contract.pdfUrl && (
          <a href={contract.pdfUrl} download className={buttonVariants({ size: 'lg', className: 'h-10 px-5' })}>
            <Download aria-hidden="true" />
            Baixar PDF
          </a>
        )}
        <Button
          variant={contract.pdfUrl ? 'outline' : 'default'}
          size="lg"
          className="h-10 px-5"
          disabled={generate.isPending}
          onClick={run}
        >
          {contract.pdfUrl ? <RefreshCw aria-hidden="true" /> : <FileText aria-hidden="true" />}
          {generate.isPending ? 'Gerando…' : contract.pdfUrl ? 'Gerar de novo' : 'Gerar PDF'}
        </Button>
      </div>
      {problem && (
        <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {problem}
        </p>
      )}
    </section>
  )
}

export function ContractDetailPage({ contract }: { contract: Contract }) {
  const { occupant, rentTerms } = contract
  const active = contract.status === 'active'

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <Link
        to="/app/contratos"
        className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Contratos
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Contrato de {CONTRACT_TYPE_LABEL[contract.contractType].toLowerCase()}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{occupant.name}</h1>
          <p className="mt-1 text-sm">
            <Link
              to="/app/imoveis/$propertyId"
              params={{ propertyId: contract.propertyId }}
              className="font-medium underline-offset-4 hover:underline"
            >
              {contract.propertyName}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border bg-card px-3.5 py-2 text-sm">
            <ContractStatusBadge status={contract.status} />
          </span>
          {active && (
            <>
              <CancelContractButton contract={contract} />
              <EndContractDialog contract={contract} />
              <Link
                to="/app/contratos/$contractId/editar"
                params={{ contractId: contract.id }}
                className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10 px-5' })}
              >
                <Pencil aria-hidden="true" />
                Editar
              </Link>
            </>
          )}
        </div>
      </header>

      {!active && (
        <p className="mt-4 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {contract.status === 'ended' ? 'Este contrato foi encerrado' : 'Este contrato foi cancelado'} e não pode mais ser
          alterado.
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <DetailCard
          title="Ocupante"
          items={[
            { label: 'Nome', value: occupant.name },
            { label: 'CPF ou CNPJ', value: occupant.document && formatDocument(occupant.document) },
            {
              label: 'E-mail',
              value: occupant.email && (
                <a href={`mailto:${occupant.email}`} className="underline-offset-4 hover:underline">
                  {occupant.email}
                </a>
              ),
            },
            { label: 'Telefone', value: occupant.phone && formatPhone(occupant.phone) },
          ]}
        />
        <DetailCard
          title="Vigência"
          items={[
            { label: 'Início', value: formatDate(contract.startDate) },
            { label: 'Fim', value: contract.endDate ? formatDate(contract.endDate) : 'Prazo indeterminado' },
          ]}
        />
        {rentTerms ? (
          <DetailCard
            title="Aluguel"
            items={[
              { label: 'Aluguel mensal', value: formatMoney(rentTerms.monthlyRentCents) },
              { label: 'Vencimento', value: `Dia ${rentTerms.dueDay}` },
              { label: 'Reajuste', value: rentTerms.adjustmentIndex ? ADJUSTMENT_INDEX_LABEL[rentTerms.adjustmentIndex] : 'Sem índice' },
            ]}
          />
        ) : (
          <DetailCard title="Aluguel">
            <p className="mt-3 text-sm text-muted-foreground">
              Contratos de temporada não têm aluguel fixo: a receita vem das reservas do imóvel.
            </p>
          </DetailCard>
        )}
        {contract.contractType === 'conventional' && <ContractPdf contract={contract} />}
        {contract.notes && (
          <DetailCard title="Observações">
            <p className="mt-3 text-sm whitespace-pre-line">{contract.notes}</p>
          </DetailCard>
        )}
      </div>
    </main>
  )
}
