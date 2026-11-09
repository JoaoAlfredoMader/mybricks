import type { StorageProvider } from "../../lib/storage/storage.js";
import { AppError } from "../../shared/errors/app-error.js";
import { extensionFor } from "../files/file-upload.js";
import { type ListingModerationDto, type ListingsDto, toListingDto } from "./listings.dto.js";
import type { ListingsRepository } from "./listings.repository.js";
import type { ListListingsInput } from "./listings.schemas.js";

export interface ListingCover {
  bytes: Buffer;
  mimeType: string;
  /** A neutral name: the owner's file name never reaches the public. */
  fileName: string;
}

export interface ModerationResult {
  listing: ListingModerationDto;
  organizationId: string;
  /** `false` when the listing was already in the state asked for. */
  changed: boolean;
}

export interface ListingsService {
  /** Public. */
  list(query: ListListingsInput): Promise<ListingsDto>;
  /** Public: the first photo of a live listing. */
  cover(propertyId: string): Promise<ListingCover>;
  /** Platform admin: take a listing down or show it again. */
  setHidden(propertyId: string, hidden: boolean): Promise<ModerationResult>;
}

export interface ListingsServiceOptions {
  /** The platform's WhatsApp, in `wa.me` format. */
  whatsappNumber: string;
}

/** Service layer: business rules. No HTTP, no Prisma. */
export function createListingsService(
  repository: ListingsRepository,
  storage: StorageProvider,
  { whatsappNumber }: ListingsServiceOptions,
): ListingsService {
  return {
    async list({ limit }) {
      const records = await repository.listLive(limit);
      const items = records.flatMap((record) => toListingDto(record) ?? []);
      return { whatsappNumber, items };
    },

    async cover(propertyId) {
      // Pending, hidden and unknown listings are all the same 404: a stranger learns nothing about them.
      const photo = await repository.findLiveCover(propertyId);
      if (!photo) throw AppError.notFound("Listing not found");

      const object = await storage.get(photo.storageKey);
      if (!object) {
        console.error(`Listing ${propertyId} has no object in the storage (${photo.storageKey})`);
        throw AppError.notFound("Listing not found");
      }
      const extension = extensionFor(photo.mimeType);
      return { bytes: object.body, mimeType: photo.mimeType, fileName: extension ? `cover.${extension}` : "cover" };
    },

    async setHidden(propertyId, hidden) {
      const current = await repository.findForSale(propertyId);
      if (!current) throw AppError.notFound("Listing not found");

      const isHidden = current.listingHiddenAt !== null;
      if (isHidden === hidden) {
        // Already there: the date of the first moderation stays.
        return {
          listing: { propertyId, hidden, hiddenAt: current.listingHiddenAt?.toISOString() ?? null },
          organizationId: current.organizationId,
          changed: false,
        };
      }

      const hiddenAt = hidden ? new Date() : null;
      await repository.setHiddenAt(propertyId, hiddenAt);
      return {
        listing: { propertyId, hidden, hiddenAt: hiddenAt?.toISOString() ?? null },
        organizationId: current.organizationId,
        changed: true,
      };
    },
  };
}
