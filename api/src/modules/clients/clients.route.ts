import { Hono } from "hono";
import type { Database } from "../../db/database.js";
import type { AppEnv } from "../../shared/http/app-env.js";
import { requireAuth } from "../../shared/http/auth.middleware.js";
import { audited } from "../../shared/http/audit.middleware.js";
import { tenantScope } from "../../shared/http/tenant.js";
import { validate } from "../../shared/http/validate.js";
import { createClientsController } from "./clients.controller.js";
import { createClientsRepository } from "./clients.repository.js";
import { clientIdParamSchema, createClientSchema, listClientsQuerySchema, updateClientSchema } from "./clients.schemas.js";
import { createClientsService } from "./clients.service.js";

/** Route layer: HTTP binding (path, validation, serialization). */
export function createClientsRoutes(db: Database) {
  const controller = createClientsController(createClientsService(createClientsRepository(db)));

  return new Hono<AppEnv>()
    .use(requireAuth)
    .get("/", validate("query", listClientsQuerySchema), async (c) => {
      const { body } = await controller.list(tenantScope(c), c.req.valid("query"));
      return c.json(body);
    })
    .post("/", audited("create", "client"), validate("json", createClientSchema), async (c) => {
      const { status, body } = await controller.create(tenantScope(c), c.req.valid("json"));
      return c.json(body, status);
    })
    .get("/:id", validate("param", clientIdParamSchema), async (c) => {
      const { body } = await controller.get(tenantScope(c), c.req.valid("param").id);
      return c.json(body);
    })
    .patch("/:id", audited("update", "client"), validate("param", clientIdParamSchema), validate("json", updateClientSchema), async (c) => {
      const { body } = await controller.update(tenantScope(c), c.req.valid("param").id, c.req.valid("json"));
      return c.json(body);
    })
    .delete("/:id", audited("delete", "client"), validate("param", clientIdParamSchema), async (c) => {
      await controller.remove(tenantScope(c), c.req.valid("param").id);
      return c.body(null, 204);
    });
}
