import { z } from "zod";
import { ConservationState, PropertyType } from "../../db/enums.js";
import type { ListingDto, ListingModerationDto, ListingsDto } from "../../modules/listings/listings.dto.js";
import { cents, nullable, output, timestamp } from "./common.js";

// The public listings are the only data that leaves an organization. The contract test parses real
// answers with these schemas and fails on any field they do not describe, so a column added to the
// DTO without being added here (and judged safe to publish) breaks a test.

export const listingSchema = output(
  "Listing",
  z.object({
    id: z.uuid().describe("The id of the property"),
    reference: z.string().describe("The first 8 characters of the id, in capitals: what the visitor quotes on WhatsApp"),
    propertyType: z.enum(PropertyType),
    subtypeName: nullable(z.string()).describe("Apartment, House, Farm... (pt-BR)"),
    salePriceCents: cents.describe("The asking price in integer cents (BRL), never the estimated value"),
    area: z
      .object({ value: z.number(), unit: z.enum(["m2", "ha"]) })
      .describe("The private area, or the total area when there is none. Hectares (`ha`) for rural properties, square meters (`m2`) otherwise"),
    bedrooms: nullable(z.number().int()),
    suites: nullable(z.number().int()),
    bathrooms: nullable(z.number().int()),
    parkingSpaces: nullable(z.number().int()),
    builtYear: nullable(z.number().int()),
    conservationState: nullable(z.enum(ConservationState)),
    city: z.string(),
    state: z.string().describe("Two-letter state code"),
    neighborhood: z.string(),
    photoCount: z.number().int(),
    coverPhotoUrl: z.string().describe("Path of the public endpoint that serves the first photo (`/api/listings/{id}/cover`)"),
    listedAt: timestamp.describe("When the owner agreed to publish the property"),
  }) satisfies z.ZodType<ListingDto>,
);

export const listingsSchema = output(
  "Listings",
  z.object({
    whatsappNumber: z.string().describe("The platform's WhatsApp, digits only, in `wa.me` format (country code, area code, number). It is MyBricks' number, never the owner's"),
    items: z.array(listingSchema),
  }) satisfies z.ZodType<ListingsDto>,
);

export const listingModerationSchema = output(
  "ListingModeration",
  z.object({
    propertyId: z.uuid(),
    hidden: z.boolean(),
    hiddenAt: nullable(timestamp).describe("When the listing was taken down; null while it is shown"),
  }) satisfies z.ZodType<ListingModerationDto>,
);
