import { PROPERTY_TYPE_LABEL } from '@/features/properties/lib/labels'
import type { Listing } from '../api/queries'

/** "Apartamento no Centro": the internal name never leaves the owner's portfolio, so the card builds its own. */
export function listingTitle(listing: Pick<Listing, 'subtypeName' | 'propertyType' | 'neighborhood'>): string {
  return `${listing.subtypeName ?? PROPERTY_TYPE_LABEL[listing.propertyType]} no ${listing.neighborhood}`
}
