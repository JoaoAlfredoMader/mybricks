import { Hono } from "hono";
import type { Database } from "../../db/database.js";
import type { AppEnv } from "../../shared/http/app-env.js";
import { audited } from "../../shared/http/audit.middleware.js";
import { requireAuth, requirePlatformAdmin } from "../../shared/http/auth.middleware.js";
import { tenantScope } from "../../shared/http/tenant.js";
import { validate } from "../../shared/http/validate.js";
import { createFeedbackController } from "./feedback.controller.js";
import { createFeedbackRepository } from "./feedback.repository.js";
import {
  createFeedbackSchema,
  feedbackIdParamSchema,
  listFeedbackQuerySchema,
  updateFeedbackSchema,
} from "./feedback.schemas.js";
import { createFeedbackService } from "./feedback.service.js";

function createController(db: Database) {
  return createFeedbackController(createFeedbackService(createFeedbackRepository(db)));
}

/** Route layer, for the people using the app: send feedback and see what they sent. */
export function createFeedbackRoutes(db: Database) {
  const controller = createController(db);

  return new Hono<AppEnv>()
    .use(requireAuth)
    .post("/", audited("create", "feedback"), validate("json", createFeedbackSchema), async (c) => {
      const { status, body } = await controller.send(tenantScope(c), c.req.valid("json"));
      return c.json(body, status);
    })
    .get("/", validate("query", listFeedbackQuerySchema), async (c) => {
      const { body } = await controller.listMine(tenantScope(c), c.req.valid("query"));
      return c.json(body);
    });
}

/** Route layer, for the platform operator (owner panel): read everything and close the loop. */
export function createAdminFeedbackRoutes(db: Database) {
  const controller = createController(db);

  return new Hono<AppEnv>()
    .use(requirePlatformAdmin)
    .get("/", validate("query", listFeedbackQuerySchema), async (c) => {
      const { body } = await controller.listAll(c.req.valid("query"));
      return c.json(body);
    })
    .patch("/:id", audited("update", "feedback", { platformLevel: true }), validate("param", feedbackIdParamSchema), validate("json", updateFeedbackSchema), async (c) => {
      const { body } = await controller.setStatus(c.req.valid("param").id, c.req.valid("json").status);
      return c.json(body);
    });
}
