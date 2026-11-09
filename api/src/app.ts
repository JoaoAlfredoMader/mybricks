import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { DEFAULT_LISTINGS_WHATSAPP_NUMBER, type Env } from "./config/env.js";
import type { Database } from "./db/database.js";
import type { StorageProvider } from "./lib/storage/storage.js";
import type { Auth } from "./modules/auth/auth.js";
import { createAgenciesRoutes } from "./modules/agencies/agencies.route.js";
import type { AuditRecorder } from "./modules/audit/audit.recorder.js";
import { createOpenApiRoutes } from "./openapi/openapi.route.js";
import { createAdminAuditRoutes, createAuditRoutes } from "./modules/audit/audit.route.js";
import { createAuthRoutes } from "./modules/auth/auth.route.js";
import type { ProvisioningService } from "./modules/auth/provisioning.service.js";
import { createClientsRoutes } from "./modules/clients/clients.route.js";
import { createContractDocumentsRoutes } from "./modules/contract-documents/contract-documents.route.js";
import { createContractTemplatesRoutes } from "./modules/contract-templates/contract-templates.route.js";
import { createContractsRoutes } from "./modules/contracts/contracts.route.js";
import { createDocumentsRoutes } from "./modules/documents/documents.route.js";
import { createAdminFeedbackRoutes, createFeedbackRoutes } from "./modules/feedback/feedback.route.js";
import { createHealthRoutes } from "./modules/health/health.route.js";
import { createKpisRoutes } from "./modules/kpis/kpis.route.js";
import { createAdminListingsRoutes, createListingsRoutes } from "./modules/listings/listings.route.js";
import { createLookupsRoutes } from "./modules/lookups/lookups.route.js";
import { createOccupantsRoutes } from "./modules/occupants/occupants.route.js";
import { createPhotosRoutes } from "./modules/photos/photos.route.js";
import { createPropertiesRoutes } from "./modules/properties/properties.route.js";
import { createProposalsRoutes } from "./modules/proposals/proposals.route.js";
import { createReservationsRoutes } from "./modules/reservations/reservations.route.js";
import { createSessionRoutes } from "./modules/session/session.route.js";
import { createTransactionsRoutes } from "./modules/transactions/transactions.route.js";
import { AppError } from "./shared/errors/app-error.js";
import type { AppEnv } from "./shared/http/app-env.js";
import { blockDeletesWhileImpersonating, loadAuthContext } from "./shared/http/auth.middleware.js";

/** Largest JSON body any route accepts: the biggest real one is the contract template, a few dozen KB. */
const JSON_BODY_LIMIT_BYTES = 1024 * 1024;

export interface AppDependencies {
  db: Database;
  env: Pick<Env, "FRONTEND_URL"> & Partial<Pick<Env, "NODE_ENV" | "MAX_UPLOAD_MB" | "BETTER_AUTH_URL" | "LISTINGS_WHATSAPP_NUMBER">>;
  auth: Auth;
  provisioning: ProvisioningService;
  audit: AuditRecorder;
  /** Where uploaded files go (photos, documents). */
  storage: StorageProvider;
}

export function createApp({ db, env, auth, provisioning, audit, storage }: AppDependencies) {
  const maxUploadBytes = (env.MAX_UPLOAD_MB ?? 15) * 1024 * 1024;
  const listings = { whatsappNumber: env.LISTINGS_WHATSAPP_NUMBER ?? DEFAULT_LISTINGS_WHATSAPP_NUMBER };
  const app = new Hono<AppEnv>();

  // Request logs would drown the test output.
  if (env.NODE_ENV !== "test") app.use(logger());
  app.use("/api/*", cors({ origin: env.FRONTEND_URL, credentials: true }));
  // nosniff, frame denial, HSTS and the rest of the usual response headers.
  app.use("*", secureHeaders());
  // Anything that is not a file upload is a small JSON body; the upload routes enforce their own, larger, limit.
  const jsonLimit = bodyLimit({
    maxSize: JSON_BODY_LIMIT_BYTES,
    onError: (c) => c.json({ error: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large" } }, 413),
  });
  app.use("/api/*", (c, next) => (c.req.header("content-type")?.startsWith("multipart/") ? next() : jsonLimit(c, next)));

  app.route("/health", createHealthRoutes(db));
  app.route("/api", createOpenApiRoutes({ serverUrl: env.BETTER_AUTH_URL ?? "http://localhost:3000" }));

  // Better Auth answers on its own; everything else under /api gets the session context.
  app.route("/api/auth", createAuthRoutes(auth));
  // The public listings need no session, so they are mounted before it is loaded.
  app.route("/api/listings", createListingsRoutes(db, storage, listings));
  app.use("/api/*", loadAuthContext(auth, provisioning));
  app.use("/api/*", blockDeletesWhileImpersonating);
  app.use("/api/*", async (c, next) => {
    c.set("audit", audit);
    await next();
  });
  app.route("/api/me", createSessionRoutes());
  app.route("/api/admin/audit-logs", createAdminAuditRoutes(db));
  app.route("/api/admin/feedback", createAdminFeedbackRoutes(db));
  app.route("/api/admin/listings", createAdminListingsRoutes(db, storage, listings));
  app.route("/api/audit-logs", createAuditRoutes(db));
  app.route("/api/agencies", createAgenciesRoutes(db));
  app.route("/api/clients", createClientsRoutes(db));
  app.route("/api/contract-template", createContractTemplatesRoutes(db));
  app.route("/api/contracts/:id/pdf", createContractDocumentsRoutes(db, storage));
  app.route("/api/contracts", createContractsRoutes(db));
  app.route("/api/feedback", createFeedbackRoutes(db));
  app.route("/api/kpis", createKpisRoutes(db));
  app.route("/api/lookups", createLookupsRoutes(db));
  app.route("/api/properties", createPropertiesRoutes(db));
  app.route("/api/properties/:propertyId/documents", createDocumentsRoutes(db, storage, maxUploadBytes));
  app.route("/api/properties/:propertyId/photos", createPhotosRoutes(db, storage, maxUploadBytes));
  app.route("/api/properties/:propertyId/proposals", createProposalsRoutes(db));
  app.route("/api/occupants", createOccupantsRoutes(db));
  app.route("/api/reservations", createReservationsRoutes(db));
  app.route("/api/transactions", createTransactionsRoutes(db));

  app.notFound((c) =>
    c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404),
  );

  app.onError((error, c) => {
    // Raised by Hono itself, e.g. a malformed JSON body.
    if (error instanceof HTTPException && error.status < 500) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: error.message } }, error.status);
    }
    if (error instanceof AppError) {
      return c.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        error.status,
      );
    }
    console.error(error);
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "Unexpected error" } },
      500,
    );
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
