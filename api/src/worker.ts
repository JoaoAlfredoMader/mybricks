import type { ExecutionContext } from "hono";
import * as pdfkit from "pdfkit";
import Helvetica from "pdfkit/standard-fonts/Helvetica";
import HelveticaBold from "pdfkit/standard-fonts/HelveticaBold";
import HelveticaBoldOblique from "pdfkit/standard-fonts/HelveticaBoldOblique";
import HelveticaOblique from "pdfkit/standard-fonts/HelveticaOblique";
import { loadEnv } from "./config/env.js";
import { composeContainer } from "./composition.js";
import { createPrismaClient } from "./lib/prisma.js";
import { runMaintenance } from "./modules/maintenance/maintenance.js";

/**
 * What the Worker receives: plain variables and secrets (strings) plus the Hyperdrive binding, which
 * hands out a connection string that goes through Cloudflare's pool in front of the real database.
 */
interface Bindings {
  HYPERDRIVE: { connectionString: string };
  [name: string]: unknown;
}

// On Node pdfkit reads its font metrics from disk; its browser build, which is what a Worker gets,
// has to be handed them. These are the four faces contract-pdf.ts uses.
(pdfkit as unknown as { registerStdFonts(...fonts: unknown[]): void }).registerStdFonts(
  Helvetica,
  HelveticaBold,
  HelveticaBoldOblique,
  HelveticaOblique,
);

/** A Worker call has at most 6 simultaneous outgoing connections, so the pool stays under that. */
const MAX_CONNECTIONS = 5;

/**
 * Builds everything for one invocation. Nothing is kept between requests: a database client or a
 * connection created in one request cannot be used in another on a Worker.
 */
function build(bindings: Bindings, ctx: ExecutionContext) {
  const variables = Object.fromEntries(
    Object.entries(bindings).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const env = loadEnv({ ...variables, DATABASE_URL: bindings.HYPERDRIVE.connectionString });
  const prisma = createPrismaClient(env.DATABASE_URL, { maxConnections: MAX_CONNECTIONS });
  const container = composeContainer(prisma, env, { runInBackground: (promise) => ctx.waitUntil(promise) });
  return { env, container };
}

export default {
  async fetch(request: Request, bindings: Bindings, ctx: ExecutionContext): Promise<Response> {
    const { container } = build(bindings, ctx);
    try {
      return await container.app.fetch(request, bindings, ctx);
    } finally {
      // Responses are fully buffered, so nothing is still reading from the pool here.
      ctx.waitUntil(container.prisma.$disconnect());
    }
  },

  /** Cron Trigger: the housekeeping the Node server runs on a timer (expired demos, orphan files, old audit entries). */
  async scheduled(_controller: unknown, bindings: Bindings, ctx: ExecutionContext): Promise<void> {
    const { container } = build(bindings, ctx);
    try {
      const report = await runMaintenance({ prisma: container.prisma, storage: container.storage, now: new Date() });
      if (Object.values(report).some((count) => count > 0)) console.log(`Maintenance: ${JSON.stringify(report)}`);
    } finally {
      await container.prisma.$disconnect();
    }
  },
};
