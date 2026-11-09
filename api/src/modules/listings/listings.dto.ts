import type { ConservationState, PropertyType } from "../../generated/prisma/enums.js";
import { centsToNumber } from "../../shared/money.js";
import type { ListingRecord } from "./listings.repository.js";

/**
 * A for-sale property as the public sees it. This is the ONLY data that leaves an organization, so
 * the shape is a whitelist: every field is picked one by one from a query that also selects only
 * these columns. Never add a field without asking whether a stranger may read it. Never here: the
 * name, notes, street, number, complement, postal code, coordinates, client, owner, agency,
 * organization, estimated value, expenses, ownership share, financing, rent, documents or any id
 * of an organization or user.
 */
export interface ListingDto {
  /** The id of the property. */
  id: string;
  /** The first 8 characters of the id, in capitals: what the visitor quotes on WhatsApp. */
  reference: string;
  propertyType: PropertyType;
  subtypeName: string | null;
  salePriceCents: number;
  area: { value: number; unit: "m2" | "ha" };
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  builtYear: number | null;
  conservationState: ConservationState | null;
  city: string;
  state: string;
  neighborhood: string;
  photoCount: number;
  /** Path of the endpoint that serves the first photo. */
  coverPhotoUrl: string;
  /** When the owner agreed to publish it. */
  listedAt: string;
}

export interface ListingsDto {
  /** The platform's WhatsApp (digits only, `wa.me` format), where every card leads. Not the owner's. */
  whatsappNumber: string;
  items: ListingDto[];
}

/** Answer of the moderation endpoint. */
export interface ListingModerationDto {
  propertyId: string;
  hidden: boolean;
  hiddenAt: string | null;
}

/** `null` for a row that does not have what a card needs (the query already filters those out). */
export function toListingDto(record: ListingRecord): ListingDto | null {
  const { address } = record;
  const area = record.privateArea ?? record.totalArea;
  if (record.listingPriceCents === null || record.listingConsentedAt === null || !address?.neighborhood || area === null) {
    return null;
  }
  return {
    id: record.id,
    reference: record.id.slice(0, 8).toUpperCase(),
    propertyType: record.propertyType,
    subtypeName: record.subtype?.name ?? null,
    salePriceCents: centsToNumber(record.listingPriceCents),
    // Areas are stored in m2, except rural ones, which are in hectares.
    area: { value: area.toNumber(), unit: record.propertyType === "rural" ? "ha" : "m2" },
    bedrooms: record.bedrooms,
    suites: record.suites,
    bathrooms: record.bathrooms,
    parkingSpaces: record.parkingSpaces,
    builtYear: record.builtYear,
    conservationState: record.conservationState,
    city: address.city.name,
    state: address.city.state,
    neighborhood: address.neighborhood,
    photoCount: record._count.photos,
    coverPhotoUrl: `/api/listings/${record.id}/cover`,
    listedAt: record.listingConsentedAt.toISOString(),
  };
}
