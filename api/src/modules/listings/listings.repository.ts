import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import type { ConservationState, PropertyType } from "../../db/enums.js";
import { cities, properties, propertyAddresses, propertyPhotos, propertySubtypes, storedFiles } from "../../db/schema.js";
import { liveListingWhere } from "../properties/listing-status.js";

/** Only the columns a listing shows: the query itself never reads anything else about the property. */
export interface ListingRecord {
  id: string;
  propertyType: PropertyType;
  subtype: { name: string } | null;
  listingPriceCents: bigint | null;
  listingConsentedAt: Date | null;
  privateArea: number | null;
  totalArea: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  builtYear: number | null;
  conservationState: ConservationState | null;
  address: { neighborhood: string | null; city: { name: string; state: string } } | null;
  _count: { photos: number };
}

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
 * Repository layer: the only place that talks to the database. The public reads here do NOT use a tenant
 * scope: they cross organizations on purpose, and `liveListingWhere()` is their whole access control.
 */
export function createListingsRepository(db: Database): ListingsRepository {
  return {
    async listLive(limit) {
      const rows = await db
        .select({
          id: properties.id,
          propertyType: properties.propertyType,
          subtypeName: propertySubtypes.name,
          listingPriceCents: properties.listingPriceCents,
          listingConsentedAt: properties.listingConsentedAt,
          privateArea: properties.privateArea,
          totalArea: properties.totalArea,
          bedrooms: properties.bedrooms,
          suites: properties.suites,
          bathrooms: properties.bathrooms,
          parkingSpaces: properties.parkingSpaces,
          builtYear: properties.builtYear,
          conservationState: properties.conservationState,
          addressPropertyId: propertyAddresses.propertyId,
          neighborhood: propertyAddresses.neighborhood,
          cityName: cities.name,
          cityState: cities.state,
          photoCount: sql<number>`(select count(*) from ${propertyPhotos} where ${propertyPhotos.propertyId} = ${properties.id})`,
        })
        .from(properties)
        .leftJoin(propertySubtypes, eq(propertySubtypes.id, properties.subtypeId))
        .leftJoin(propertyAddresses, eq(propertyAddresses.propertyId, properties.id))
        .leftJoin(cities, eq(cities.ibgeCode, propertyAddresses.cityId))
        .where(liveListingWhere())
        .orderBy(desc(properties.listingConsentedAt), asc(properties.id))
        .limit(limit);

      return rows.map(({ subtypeName, addressPropertyId, neighborhood, cityName, cityState, photoCount, ...row }) => ({
        ...row,
        subtype: subtypeName === null ? null : { name: subtypeName },
        address:
          addressPropertyId === null || cityName === null || cityState === null
            ? null
            : { neighborhood, city: { name: cityName, state: cityState } },
        _count: { photos: Number(photoCount) },
      }));
    },

    async findLiveCover(propertyId) {
      const [cover] = await db
        .select({ storageKey: storedFiles.storageKey, mimeType: storedFiles.mimeType })
        .from(propertyPhotos)
        .innerJoin(properties, eq(properties.id, propertyPhotos.propertyId))
        .innerJoin(storedFiles, eq(storedFiles.id, propertyPhotos.fileId))
        .where(and(liveListingWhere(), eq(properties.id, propertyId)))
        .orderBy(asc(propertyPhotos.position), asc(propertyPhotos.createdAt), asc(propertyPhotos.id))
        .limit(1);
      return cover ?? null;
    },

    async findForSale(propertyId) {
      const [row] = await db
        .select({ organizationId: properties.organizationId, listingHiddenAt: properties.listingHiddenAt })
        .from(properties)
        .where(and(eq(properties.id, propertyId), isNotNull(properties.listingPriceCents)));
      return row ?? null;
    },

    async setHiddenAt(propertyId, hiddenAt) {
      await db
        .update(properties)
        .set({ listingHiddenAt: hiddenAt })
        .where(and(eq(properties.id, propertyId), isNotNull(properties.listingPriceCents)));
    },
  };
}
