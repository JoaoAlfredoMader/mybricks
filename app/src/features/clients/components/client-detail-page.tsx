import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DetailCard } from '@/components/detail-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { StatusBadge } from '@/features/properties/components/status-badge'
import { PROPERTY_TYPE_LABEL, USAGE_LABEL } from '@/features/properties/lib/labels'
import { formatDocument, formatPhone, formatTimestamp, formatWholeMoney } from '@/lib/format'
import { type Client, clientPropertiesQueryOptions } from '../api/queries'
import { useDeleteClient } from '../hooks/use-client-mutations'
import { clientErrorMessage } from '../lib/client-form'
import { DOCUMENT_LABEL, PERSON_TYPE_LABEL } from '../lib/labels'

function DeleteClientButton({ client }: { client: Client }) {
  const remove = useDeleteClient(client.id)
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="lg" className="h-10 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 aria-hidden="true" />
          Excluir
        </Button>
      }
      title={`Excluir ${client.name}?`}
      description="O cliente sai do cadastro. Não dá para desfazer. Só se pode excluir um cliente que não é dono de nenhum imóvel."
      confirmLabel="Excluir cliente"
      onConfirm={() => remove.mutateAsync()}
      errorMessage={(error) => clientErrorMessage(error, 'Não foi possível excluir agora. Tente de novo.')}
    />
  )
}

/** The properties the client owns, with a way to open each one. */
function ClientProperties({ clientId }: { clientId: string }) {
  const page = useQuery(clientPropertiesQueryOptions(clientId)).data

  return (
    <section aria-labelledby="client-properties-title" className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6">
      <h2 id="client-properties-title" className="font-semibold">
        Imóveis
      </h2>
      <p className="text-sm text-muted-foreground">
        {!page
          ? ' '
          : page.total === 0
            ? 'Este cliente ainda não é dono de nenhum imóvel.'
            : page.total > page.items.length
              ? `Os ${page.items.length} primeiros de ${page.total}, por nome.`
              : `${page.total} ${page.total === 1 ? 'imóvel' : 'imóveis'}, por nome.`}
      </p>
      {page && page.items.length > 0 && (
        <ul className="mt-4 divide-y rounded-xl border">
          {page.items.map((property) => (
            <li key={property.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <div className="min-w-0">
                <Link
                  to="/app/imoveis/$propertyId"
                  params={{ propertyId: property.id }}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {property.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {PROPERTY_TYPE_LABEL[property.propertyType]} · {USAGE_LABEL[property.usageType]}
                  {property.estimatedValueCents !== null && ` · ${formatWholeMoney(property.estimatedValueCents)}`}
                  {property.ownershipPercentage < 100 && ` · ${property.ownershipPercentage}% do cliente`}
                </p>
              </div>
              <StatusBadge status={property.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface ClientDetailPageProps {
  client: Client
  /** False while a platform admin impersonates: the API refuses every DELETE then. */
  canDelete: boolean
}

export function ClientDetailPage({ client, canDelete }: ClientDetailPageProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <Link
        to="/app/clientes"
        className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Clientes
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{PERSON_TYPE_LABEL[client.personType]}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{client.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canDelete && <DeleteClientButton client={client} />}
          <Link
            to="/app/clientes/$clientId/editar"
            params={{ clientId: client.id }}
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10 px-5' })}
          >
            <Pencil aria-hidden="true" />
            Editar
          </Link>
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <DetailCard
          title="Dados"
          items={[
            { label: 'Tipo', value: PERSON_TYPE_LABEL[client.personType] },
            { label: DOCUMENT_LABEL[client.personType], value: client.document && formatDocument(client.document) },
            {
              label: 'E-mail',
              value: client.email && (
                <a href={`mailto:${client.email}`} className="underline-offset-4 hover:underline">
                  {client.email}
                </a>
              ),
            },
            { label: 'WhatsApp', value: client.whatsapp && formatPhone(client.whatsapp) },
            { label: 'Cadastrado em', value: formatTimestamp(client.createdAt) },
          ]}
        />
        <ClientProperties clientId={client.id} />
      </div>
    </main>
  )
}
