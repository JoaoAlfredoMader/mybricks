import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { listingsQueryOptions } from '../api/queries'
import { ListingsCarousel } from './listings-carousel'

interface ListingsShowcaseProps {
  variant: 'app' | 'landing'
}

/** Quiet placeholders while the listings load: no heading yet, since the section may turn out empty. */
function Skeleton({ variant }: ListingsShowcaseProps) {
  const landing = variant === 'landing'
  return (
    <section aria-busy="true" className={cn(landing ? 'px-6 pb-24 sm:px-12' : 'mt-4')}>
      <div aria-hidden="true" className="mx-auto flex max-w-5xl gap-4 overflow-hidden">
        {[0, 1, 2].map((slot) => (
          <div
            key={slot}
            className={cn(
              'h-56 w-72 shrink-0 animate-pulse bg-current/8 motion-reduce:animate-none',
              landing ? 'rounded-[28px]' : 'rounded-2xl',
            )}
          />
        ))}
      </div>
    </section>
  )
}

/** The public listings, in the app's panel or on the landing; nothing at all when there is none to show or the API fails. */
export function ListingsShowcase({ variant }: ListingsShowcaseProps) {
  const { data, isPending } = useQuery(listingsQueryOptions)

  if (isPending) return <Skeleton variant={variant} />
  if (!data || data.items.length === 0) return null

  const carousel = (
    <ListingsCarousel listings={data.items} whatsappNumber={data.whatsappNumber} variant={variant} label="Imóveis à venda" />
  )

  if (variant === 'landing') {
    return (
      <section aria-labelledby="listings-title" className="border-t border-current/10 px-6 py-24 sm:px-12 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 id="listings-title" className="max-w-[20ch] text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl">
            Imóveis à venda
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-pretty text-(--muted)">
            Anunciados por quem usa o MyBricks. Toque no WhatsApp de um deles e a gente conversa sobre aquele imóvel.
          </p>
          <div className="mt-10">{carousel}</div>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="listings-title" className="mt-4 rounded-2xl border bg-card p-5 sm:p-6">
      <h2 id="listings-title" className="font-semibold">
        Imóveis à venda
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Anúncios de toda a plataforma. O WhatsApp abre uma conversa com a MyBricks.</p>
      <div className="mt-4">{carousel}</div>
    </section>
  )
}
