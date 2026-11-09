import { AsyncLocalStorage } from "node:async_hooks";
import type { ExecutionContext } from "hono";
import * as pdfkit from "pdfkit";
import Helvetica from "pdfkit/standard-fonts/Helvetica";
import HelveticaBold from "pdfkit/standard-fonts/HelveticaBold";
import HelveticaBoldOblique from "pdfkit/standard-fonts/HelveticaBoldOblique";
import HelveticaOblique from "pdfkit/standard-fonts/HelveticaOblique";
import { loadEnv } from "./config/env.js";
import { composeContainer } from "./composition.js";
import { createD1Database } from "./db/client.d1.js";
import { createR2Storage, type R2BucketLike } from "./lib/storage/r2-storage.js";
import { runMaintenance } from "./modules/maintenance/maintenance.js";

// On Node pdfkit reads its font metrics from disk; its browser build, which is what a Worker gets,
// has to be handed them. These are the four faces contract-pdf.ts uses.
(pdfkit as unknown as { registerStdFonts(...fonts: unknown[]): void }).registerStdFonts(
  Helvetica,
  HelveticaBold,
  HelveticaBoldOblique,
  HelveticaOblique,
);

/**
 * What the Worker receives: plain variables and secrets (strings) plus the D1 binding named `DB`
 * and the R2 bucket named `FILES` (see wrangler.jsonc).
 */
interface Bindings {
  DB: unknown;
  /** The R2 bucket for photos, documents and contract PDFs. */
  FILES: R2BucketLike;
  [name: string]: unknown;
}

/** The invocation that is running, so background work (the e-mail sent after a response) joins the right `waitUntil`. */
const invocation = new AsyncLocalStorage<ExecutionContext>();

/**
 * Wiring the app (Better Auth, every service, every OpenAPI route) costs a few hundred milliseconds of CPU, so it
 * happens once per Worker instance, like the Node server does once per process, and not once per request.
 * Bindings and variables do not change while an instance lives; D1 is a binding, there is no connection to manage.
 */
let container: ReturnType<typeof composeContainer> | undefined;

function build(bindings: Bindings) {
  if (container) return container;
  const variables = Object.fromEntries(
    Object.entries(bindings).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const env = loadEnv(variables);
  container = composeContainer(createD1Database(bindings.DB), env, {
    storage: createR2Storage(bindings.FILES),
    runInBackground: (promise) => {
      const ctx = invocation.getStore();
      if (ctx) ctx.waitUntil(promise);
    },
  });
  return container;
}

export default {
  fetch(request: Request, bindings: Bindings, ctx: ExecutionContext): Promise<Response> | Response {
    return invocation.run(ctx, () => build(bindings).app.fetch(request, bindings, ctx));
  },

  /** Cron Trigger: the housekeeping the Node server runs on a timer (expired demos, orphan files, old audit entries). */
  async scheduled(_controller: unknown, bindings: Bindings, ctx: ExecutionContext): Promise<void> {
    await invocation.run(ctx, async () => {
      const { db, storage } = build(bindings);
      const report = await runMaintenance({ db, storage, now: new Date() });
      if (Object.values(report).some((count) => count > 0)) console.log(`Maintenance: ${JSON.stringify(report)}`);
    });
  },
};
