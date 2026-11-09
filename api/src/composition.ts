import { createApp } from "./app.js";
import type { Env } from "./config/env.js";
import type { Database } from "./db/database.js";
import { createMailer } from "./lib/mail/create-mailer.js";
import type { Mailer } from "./lib/mail/mailer.js";
import type { StorageProvider } from "./lib/storage/storage.js";
import { createAuditRecorder } from "./modules/audit/audit.recorder.js";
import { createAuditRepository } from "./modules/audit/audit.repository.js";
import { createAuth } from "./modules/auth/auth.js";
import { createProvisioningRepository } from "./modules/auth/provisioning.repository.js";
import { createProvisioningService } from "./modules/auth/provisioning.service.js";
import { createDemoSeeder } from "./modules/demo/demo-workspace.js";

export interface ContainerOptions {
  /** Where uploaded files go: the S3/local driver on Node (`container.ts`), the R2 binding on a Worker. */
  storage: StorageProvider;
  /** Start guests with an empty workspace instead of the sample portfolio (tests that count rows). */
  withoutDemoData?: boolean;
  /** Replaces the e-mail driver the environment picks (tests read the outbox of a memory mailer). */
  mailer?: Mailer;
  /** Keeps work alive after the response (`ctx.waitUntil` on a Worker). */
  runInBackground?: (promise: Promise<unknown>) => void;
}

/**
 * Composition root: every dependency is wired by hand, here and only here. It receives the database
 * client instead of creating it, so each runtime brings its own: `container.ts` for Node (server,
 * scripts, tests) and `worker.ts` for Cloudflare Workers.
 */
export function composeContainer(db: Database, env: Env, options: ContainerOptions) {
  const { storage } = options;
  const mailer = options.mailer ?? createMailer(env);
  const audit = createAuditRecorder(createAuditRepository(db));
  const provisioning = createProvisioningService(createProvisioningRepository(db), {
    demoTtlHours: env.DEMO_TTL_HOURS,
    ...(options.withoutDemoData ? {} : { demoSeeder: createDemoSeeder(db) }),
  });
  const auth = createAuth({ db, env, provisioning, audit, mailer, ...(options.runInBackground ? { runInBackground: options.runInBackground } : {}) });
  const app = createApp({ db, env, auth, provisioning, audit, storage });

  return { db, storage, mailer, audit, provisioning, auth, app };
}

export type Container = ReturnType<typeof composeContainer>;
