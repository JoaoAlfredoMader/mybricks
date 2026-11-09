import { cn } from 'cn'
import { Bath, BedDouble, CarFront, type LucideIcon, Ruler } from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'
import { apiUrl } from '@/lib/api/client'
import { formatWholeMoney } from '@/lib/format'
import type { Listing } from '../api/queries'
import { type FactKey, listingFacts } from '../lib/listing-facts'
import { listingTitle } from '../lib/listing-title'
import { whatsappLink } from '../lib/whatsapp'

const FACT_ICON: Partial<Record<FactKey, LucideIcon>> = {
  area: Ruler,
  bedrooms: BedDouble,
  bathrooms: Bath,
  parking: CarFront,
}

interface ListingCardProps {
  listing: Listing
  whatsappNumber: string
  /** "app" is a pale card in the panel; "landing" is the photo on the page, text underneath. */
  variant: 'app' | 'landing'
  className?: string
}

/** One property for sale: cover, where, price and facts, with a button that opens WhatsApp about it. */
export function ListingCard({ listing, whatsappNumber, variant, className }: ListingCardProps) {
  const title = listingTitle(listing)
  const { main, extra } = listingFacts(listing)
  const landing = variant === 'landing'

  return (
    <article className={cn('flex flex-col', !landing && 'overflow-hidden rounded-2xl border border-current/12 bg-card', className)}>
      <div className={cn('relative', landing && 'mb-4')}>
        <img
          src={apiUrl(listing.coverPhotoUrl)}
          alt={`Foto de ${title}, em ${listing.city}/${listing.state}`}
          loading="lazy"
          width={640}
          height={480}
          className={cn('aspect-4/3 w-full bg-current/8 object-cover', landing && 'rounded-[28px]')}
        />
        <a
          href={whatsappLink(whatsappNumber, listing)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Falar no WhatsApp sobre ${title}`}
          className={cn(
            'absolute flex size-11 items-center justify-center rounded-full bg-(--whatsapp) text-white shadow-md transition-colors hover:bg-(--whatsapp-hover)',
            landing ? 'right-4 bottom-4' : 'right-3 bottom-3',
          )}
        >
          <WhatsAppIcon className="size-6" />
        </a>
      </div>

      <div className={cn('flex flex-1 flex-col gap-3', !landing && 'p-4')}>
        <div>
          <h3 className={cn('font-semibold tracking-tight text-balance', landing ? 'text-xl' : 'text-base')}>{title}</h3>
          <p className="mt-0.5 text-sm text-current/65">
            {listing.neighborhood} · {listing.city}/{listing.state}
          </p>
        </div>

        <p className={cn('tabular-nums', landing ? 'listing-price text-2xl' : 'text-xl font-semibold tracking-tight')}>
          {formatWholeMoney(listing.salePriceCents)}
        </p>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {main.map(({ key, text }) => {
            const Icon = FACT_ICON[key]
            return (
              <li key={key} className="flex items-center gap-1.5">
                {Icon && <Icon className="size-4 shrink-0 text-current/55" aria-hidden="true" />}
                {text}
              </li>
            )
          })}
        </ul>

        {extra.length > 0 && <p className="text-xs text-current/65">{extra.join(' · ')}</p>}
      </div>
    </article>
  )
}
