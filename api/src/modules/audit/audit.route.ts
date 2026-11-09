import { Hono } from "hono";
import type { Database } from "../../db/database.js";
import type { AppEnv } from "../../shared/http/app-env.js";
import { requireAuth, requirePlatformAdmin } from "../../shared/http/auth.middleware.js";
import { tenantScope } from "../../shared/http/tenant.js";
import { validate } from "../../shared/http/validate.js";
import { createAuditController } from "./audit.controller.js";
import { createAuditRepository } from "./audit.repository.js";
import { listAdminAuditLogsQuerySchema, listAuditLogsQuerySchema } from "./audit.schemas.js";
import { createAuditService } from "./audit.service.js";

function createController(db: Database) {
  return createAuditController(createAuditService(createAuditRepository(db)));
}

/** Route layer: the trail of the caller's organization (owners and admins). Read-only. */
export function createAuditRoutes(db: Database) {
  const controller = createController(db);

  return new Hono<AppEnv>()
    .use(requireAuth)
    .get("/", validate("query", listAuditLogsQuerySchema), async (c) => {
      const { body } = await controller.listForOrganization(tenantScope(c), c.req.valid("query"));
      return c.json(body);
    });
}

/** Route layer: the whole trail, for the platform operator. Read-only. */
export function createAdminAuditRoutes(db: Database) {
  const controller = createController(db);

  return new Hono<AppEnv>()
    .use(requirePlatformAdmin)
    .get("/", validate("query", listAdminAuditLogsQuerySchema), async (c) => {
      const { body } = await controller.listAll(c.req.valid("query"));
      return c.json(body);
    });
}
