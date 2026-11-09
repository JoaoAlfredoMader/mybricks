import { type Context, Hono } from "hono";
import type { Database } from "../../db/database.js";
import type { AppEnv } from "../../shared/http/app-env.js";
import { requireAuth } from "../../shared/http/auth.middleware.js";
import { audited, recordAudit } from "../../shared/http/audit.middleware.js";
import { tenantScope } from "../../shared/http/tenant.js";
import { validate } from "../../shared/http/validate.js";
import { createPropertiesController, type PropertyWriteResult } from "./properties.controller.js";
import { createPropertiesRepository } from "./properties.repository.js";
import {
  createPropertySchema,
  financingScheduleQuerySchema,
  listPropertiesQuerySchema,
  propertyIdParamSchema,
  updatePropertySchema,
} from "./properties.schemas.js";
import { createPropertiesService } from "./properties.service.js";

/** Putting a property on or off the market is a consent decision: it gets its own entry, beyond the generic create/update one. */
async function auditListingChange(c: Context<AppEnv>, result: PropertyWriteResult<200 | 201>): Promise<void> {
  if (!result.listingChange) return;
  await recordAudit(c, {
    action: "update",
    entityType: "property",
    entityId: result.body.id,
    status: result.status,
    details: {
      listing: result.listingChange,
      ...(result.body.forSale ? { priceCents: result.body.forSale.priceCents } : {}),
    },
  });
}

/** Route layer: HTTP binding (path, validation, serialization). */
export function createPropertiesRoutes(db: Database) {
  const controller = createPropertiesController(createPropertiesService(createPropertiesRepository(db)));

  return new Hono<AppEnv>()
    .use(requireAuth)
    .get("/", validate("query", listPropertiesQuerySchema), async (c) => {
      const { body } = await controller.list(tenantScope(c), c.req.valid("query"));
      return c.json(body);
    })
    .post("/", audited("create", "property"), validate("json", createPropertySchema), async (c) => {
      const result = await controller.create(tenantScope(c), c.req.valid("json"));
      await auditListingChange(c, result);
      return c.json(result.body, result.status);
    })
    .get("/:id", validate("param", propertyIdParamSchema), async (c) => {
      const { body } = await controller.get(tenantScope(c), c.req.valid("param").id);
      return c.json(body);
    })
    .patch("/:id", audited("update", "property"), validate("param", propertyIdParamSchema), validate("json", updatePropertySchema), async (c) => {
      const result = await controller.update(tenantScope(c), c.req.valid("param").id, c.req.valid("json"));
      await auditListingChange(c, result);
      return c.json(result.body);
    })
    .get("/:id/financing-schedule", validate("param", propertyIdParamSchema), validate("query", financingScheduleQuerySchema), async (c) => {
      const { body } = await controller.financingSchedule(tenantScope(c), c.req.valid("param").id, c.req.valid("query"));
      return c.json(body);
    })
    .delete("/:id", audited("delete", "property"), validate("param", propertyIdParamSchema), async (c) => {
      await controller.remove(tenantScope(c), c.req.valid("param").id);
      return c.body(null, 204);
    });
}
