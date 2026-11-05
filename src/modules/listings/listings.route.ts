import { Hono } from "hono";
import type { PrismaClient } from "../../lib/prisma.js";
import type { StorageProvider } from "../../lib/storage/storage.js";
import type { AppEnv } from "../../shared/http/app-env.js";
import { recordAudit } from "../../shared/http/audit.middleware.js";
import { requirePlatformAdmin } from "../../shared/http/auth.middleware.js";
import { validate } from "../../shared/http/validate.js";
import { contentDisposition } from "../files/file-upload.js";
import { createListingsController } from "./listings.controller.js";
import { createListingsRepository } from "./listings.repository.js";
import { listListingsQuerySchema, listingIdParamSchema, propertyIdParamSchema, setListingHiddenSchema } from "./listings.schemas.js";
import { type ListingsServiceOptions, createListingsService } from "./listings.service.js";

function createController(prisma: PrismaClient, storage: StorageProvider, options: ListingsServiceOptions) {
  return createListingsController(createListingsService(createListingsRepository(prisma), storage, options));
}

/**
 * Route layer, PUBLIC: no session, no tenant. Mounted under `/api/listings`, before the session is
 * loaded. What leaves the organization is only what `ListingDto` whitelists.
 */
export function createListingsRoutes(prisma: PrismaClient, storage: StorageProvider, options: ListingsServiceOptions) {
  const controller = createController(prisma, storage, options);

  return new Hono<AppEnv>()
    .get("/", validate("query", listListingsQuerySchema), async (c) => {
      const { body } = await controller.list(c.req.valid("query"));
      // Public and the same for everyone: a browser or a CDN may keep it for a minute.
      c.header("cache-control", "public, max-age=60");
      return c.json(body);
    })
    .get("/:id/cover", validate("param", listingIdParamSchema), async (c) => {
      const { body } = await controller.cover(c.req.valid("param").id);
      return c.body(new Uint8Array(body.bytes), 200, {
        "content-type": body.mimeType,
        "content-length": String(body.bytes.length),
        "content-disposition": contentDisposition("inline", body.fileName),
        // Public: the same for everyone. nosniff: never let a browser guess a different type.
        "cache-control": "public, max-age=3600",
        "x-content-type-options": "nosniff",
      });
    });
}

/** Route layer, for the platform operator (owner panel): moderate the listings. Mounted under `/api/admin/listings`. */
export function createAdminListingsRoutes(prisma: PrismaClient, storage: StorageProvider, options: ListingsServiceOptions) {
  const controller = createController(prisma, storage, options);

  return new Hono<AppEnv>()
    .use(requirePlatformAdmin)
    .patch("/:propertyId", validate("param", propertyIdParamSchema), validate("json", setListingHiddenSchema), async (c) => {
      const { propertyId } = c.req.valid("param");
      const { body } = await controller.setHidden(propertyId, c.req.valid("json").hidden);
      if (body.changed) {
        // Platform-level: it is the operator's decision, not an event of the organization's own trail.
        await recordAudit(c, {
          action: "update",
          entityType: "property",
          entityId: propertyId,
          platformLevel: true,
          status: 200,
          details: { listing: body.listing.hidden ? "hidden" : "shown", organizationId: body.organizationId },
        });
      }
      return c.json(body.listing);
    });
}
