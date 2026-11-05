import type { Listing } from '../api/queries'
import { listingTitle } from './listing-title'

/** The message the visitor sends, already naming the property so the team knows which one it is. */
export function whatsappMessage(listing: Listing): string {
  return `Olá! Tenho interesse no imóvel "${listingTitle(listing)}" em ${listing.neighborhood}, ${listing.city}/${listing.state} (ref. ${listing.reference}), anunciado na MyBricks.`
}

/** A wa.me link to the platform's number, with the message ready to send. */
export function whatsappLink(whatsappNumber: string, listing: Listing): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage(listing))}`
}
