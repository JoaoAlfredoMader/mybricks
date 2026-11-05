import { Link } from '@tanstack/react-router'
import { DetailCard } from '@/components/detail-card'
import { formatMoney, formatTimestamp } from '@/lib/format'
import type { Property } from '../api/queries'

type ForSale = NonNullable<Property['forSale']>

const STATUS: Record<ForSale['status'], { label: string; color: string; note: string }> = {
  pending: {
    label: 'Pendente',
    color: 'var(--chart-4)',
    note: 'O anúncio ainda não está no ar. Falta o que está listado abaixo.',
  },
  live: {
    label: 'No ar',
    color: 'var(--chart-3)',
    note: 'O anúncio aparece para quem visita a plataforma, com foto, metragem, bairro e preço.',
  },
  hidden: {
    label: 'Oculto pelo administrador',
    color: 'var(--muted-foreground)',
    note: 'A plataforma ocultou este anúncio, então ele não aparece para os visitantes.',
  },
}

const MISSING: Record<ForSale['missing'][number], string> = {
  photo: 'Ao menos uma foto',
  address: 'Cidade e bairro',
  area: 'A área do imóvel',
}

/** What the sale of one property looks like to the public, and what holds it back. */
export function ListingStatusCard({ propertyId, forSale }: { propertyId: string; forSale: ForSale }) {
  const { label, color, note } = STATUS[forSale.status]
  return (
    <DetailCard
      title="Anúncio"
      items={[
        {
          label: 'Situação',
          value: (
            <span className="inline-flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
              {label}
            </span>
          ),
        },
        { label: 'Preço', value: formatMoney(forSale.priceCents) },
        { label: 'Anunciado em', value: formatTimestamp(forSale.consentedAt) },
      ]}
    >
      <p className="mt-3 text-sm text-muted-foreground">{note}</p>
      {forSale.status === 'pending' && forSale.missing.length > 0 && (
        <ul className="mt-3 grid gap-2 text-sm">
          {forSale.missing.map((item) => (
            <li key={item} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-pastel-yellow px-3.5 py-2.5">
              <span>{MISSING[item]}</span>
              {item === 'photo' ? (
                <Link
                  to="/app/imoveis/$propertyId"
                  params={{ propertyId }}
                  hash="photos-title"
                  className="font-medium underline underline-offset-4"
                >
                  Adicionar fotos
                </Link>
              ) : (
                <Link
                  to="/app/imoveis/$propertyId/editar"
                  params={{ propertyId }}
                  className="font-medium underline underline-offset-4"
                >
                  Editar o imóvel
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </DetailCard>
  )
}
