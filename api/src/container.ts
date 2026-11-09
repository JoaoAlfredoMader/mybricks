import { createApp } from "./app.js";
import type { Env } from "./config/env.js";
import { createPrismaClient } from "./lib/prisma.js";
import { createMailer } from "./lib/mail/create-mailer.js";
import type { Mailer } from "./lib/mail/mailer.js";
import { createStorage } from "./lib/storage/create-storage.js";
import { createAuditRecorder } from "./modules/audit/audit.recorder.js";
import { createAuditRepository } from "./modules/audit/audit.repository.js";
import { createAuth } from "./modules/auth/auth.js";
import { createProvisioningRepository } from "./modules/auth/provisioning.repository.js";
import { createProvisioningService } from "./modules/auth/provisioning.service.js";
import { createDemoSeeder } from "./modules/demo/demo-workspace.js";

export interface ContainerOptions {
  /** Start guests with an empty workspace instead of the sample portfolio (tests that count rows). */
  withoutDemoData?: boolean;
  /** Replaces the e-mail driver the environment picks (tests read the outbox of a memory mailer). */
  mailer?: Mailer;
}

/**
 * Composition root: every dependency is wired by hand, here and only here. The server, the
 * maintenance and admin scripts and the tests all build the app through it.
 */
export function createContainer(env: Env, options: ContainerOptions = {}) {
  const prisma = createPrismaClient(env.DATABASE_URL);
  const storage = createStorage(env);
  const mailer = options.mailer ?? createMailer(env);
  const audit = createAuditRecorder(createAuditRepository(prisma));
  const provisioning = createProvisioningService(createProvisioningRepository(prisma), {
    demoTtlHours: env.DEMO_TTL_HOURS,
    ...(options.withoutDemoData ? {} : { demoSeeder: createDemoSeeder(prisma) }),
  });
  const auth = createAuth({ prisma, env, provisioning, audit, mailer });
  const app = createApp({ prisma, env, auth, provisioning, audit, storage });

  return { prisma, storage, mailer, audit, provisioning, auth, app };
}

export type Container = ReturnType<typeof createContainer>;
