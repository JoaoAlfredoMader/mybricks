import { z } from "zod";

export const MAX_LISTINGS = 24;
export const DEFAULT_LISTINGS = 12;

export const listListingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LISTINGS).default(DEFAULT_LISTINGS),
});

/** The id of a listing is the id of the property. */
export const listingIdParamSchema = z.object({ id: z.uuid() });

export const propertyIdParamSchema = z.object({ propertyId: z.uuid() });

/** `true` takes the listing down, `false` shows it again. */
export const setListingHiddenSchema = z.object({ hidden: z.boolean() });

export type ListListingsInput = z.output<typeof listListingsQuerySchema>;
