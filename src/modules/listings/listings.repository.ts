import type { Prisma } from "../../generated/prisma/client.js";
import type { PrismaClient } from "../../lib/prisma.js";
import { liveListingWhere } from "../properties/listing-status.js";

/** Only the columns a listing shows: the query itself never reads anything else about the property. */
const listingSelect = {
  id: true,
  propertyType: true,
  subtype: { select: { name: true } },
  listingPriceCents: true,
  listingConsentedAt: true,
  privateArea: true,
  totalArea: true,
  bedrooms: true,
  suites: true,
  bathrooms: true,
  parkingSpaces: true,
  builtYear: true,
  conservationState: true,
  address: { select: { neighborhood: true, city: { select: { name: true, state: true } } } },
  _count: { select: { photos: true } },
} satisfies Prisma.PropertySelect;

export type ListingRecord = Prisma.PropertyGetPayload<{ select: typeof listingSelect }>;

export interface CoverRecord {
  storageKey: string;
  mimeType: string;
}

export interface ForSaleRecord {
  organizationId: string;
  listingHiddenAt: Date | null;
}

export interface ListingsRepository {
  /** The live listings, newest consent first. Crosses organizations on purpose. */
  listLive(limit: number): Promise<ListingRecord[]>;
  /** The first photo (by position) of a live listing; `null` when it is not live. */
  findLiveCover(propertyId: string): Promise<CoverRecord | null>;
  /** A property that is for sale, whatever its status; `null` when it does not exist or is not for sale. */
  findForSale(propertyId: string): Promise<ForSaleRecord | null>;
  setHiddenAt(propertyId: string, hiddenAt: Date | null): Promise<void>;
}

/**
 * Repository layer: the only place that talks to Prisma. The public reads here do NOT use a tenant
 * scope: they cross organizations on purpose, and `liveListingWhere()` is their whole access control.
 */
export function createListingsRepository(prisma: PrismaClient): ListingsRepository {
  return {
    listLive(limit) {
      return prisma.property.findMany({
        where: liveListingWhere(),
        select: listingSelect,
        orderBy: [{ listingConsentedAt: "desc" }, { id: "asc" }],
        take: limit,
      });
    },

    async findLiveCover(propertyId) {
      const photo = await prisma.propertyPhoto.findFirst({
        where: { property: { ...liveListingWhere(), id: propertyId } },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { file: { select: { storageKey: true, mimeType: true } } },
      });
      return photo?.file ?? null;
    },

    findForSale(propertyId) {
      return prisma.property.findFirst({
        where: { id: propertyId, listingPriceCents: { not: null } },
        select: { organizationId: true, listingHiddenAt: true },
      });
    },

    async setHiddenAt(propertyId, hiddenAt) {
      await prisma.property.updateMany({
        where: { id: propertyId, listingPriceCents: { not: null } },
        data: { listingHiddenAt: hiddenAt },
      });
    },
  };
}
