import { and, count, eq, inArray, lt, notExists, type SQL } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { atomic } from "../../db/atomic.js";
import type { Database } from "../../db/database.js";
import { D1_MAX_PARAMETERS, chunk } from "../../db/helpers.js";
import {
  agencies,
  clients,
  feedbacks,
  members,
  occupants,
  organizations,
  properties,
  rateLimits,
  sessions,
  storedFiles,
  users,
  verifications,
} from "../../db/schema.js";
import type { StorageProvider } from "../../lib/storage/storage.js";
import { createAuditRepository } from "../audit/audit.repository.js";
import { sweepOrphanFiles } from "../files/orphan-sweep.js";

export interface MaintenanceDeps {
  db: Database;
  storage: StorageProvider;
  /** The moment the run is made at; injectable for tests. */
  now?: Date;
  /** Audit entries older than this are purged. */
  auditRetentionDays?: number;
  /** Files younger than this are never swept (an upload may be in flight). */
  orphanGraceMinutes?: number;
}

export interface MaintenanceReport {
  expiredDemoOrganizations: number;
  anonymousUsersRemoved: number;
  orphanFilesSwept: number;
  auditEntriesPurged: number;
  expiredSessionsPurged: number;
  expiredVerificationsPurged: number;
  /** Request counters of Better Auth's rate limiting that no window can still use. */
  rateLimitCountersPurged: number;
}

const DAY_MS = 86_400_000;

/**
 * Deletes one demo organization and everything in it. Order matters: Postgres checks each step of
 * a cascade separately, so the tables that point at others with NO ACTION have to go first.
 * The objects in the storage are deleted before the rows that know their keys; if any object
 * cannot be deleted the organization is left for the next run, rather than orphaning it.
 */
async function deleteDemoOrganization(
  { db, storage }: Pick<MaintenanceDeps, "db" | "storage">,
  organizationId: string,
): Promise<{ deleted: boolean; ownerIds: string[] }> {
  const files = await db.select({ storageKey: storedFiles.storageKey }).from(storedFiles).where(eq(storedFiles.organizationId, organizationId));
  for (const file of files) {
    try {
      await storage.delete(file.storageKey);
    } catch (error) {
      console.error(`Demo organization ${organizationId} kept: could not delete ${file.storageKey}`, error);
      return { deleted: false, ownerIds: [] };
    }
  }

  const memberRows = await db.select({ userId: members.userId }).from(members).where(eq(members.organizationId, organizationId));
  // One batch, in this order: feedback points at stored files; deleting the properties cascades contracts,
  // reservations, photos, documents and transactions; the organization goes last and cascades members,
  // invitations, the template and the audit logs.
  await atomic(db, [
    db.delete(feedbacks).where(eq(feedbacks.organizationId, organizationId)),
    db.delete(properties).where(eq(properties.organizationId, organizationId)),
    db.delete(storedFiles).where(eq(storedFiles.organizationId, organizationId)),
    db.delete(clients).where(eq(clients.organizationId, organizationId)),
    db.delete(occupants).where(eq(occupants.organizationId, organizationId)),
    db.delete(agencies).where(eq(agencies.organizationId, organizationId)),
    db.delete(organizations).where(eq(organizations.id, organizationId)),
  ]);
  return { deleted: true, ownerIds: memberRows.map((member) => member.userId) };
}

/** DELETE ... WHERE and how many rows it removed (D1 and libSQL report that differently, so it is counted first). */
async function deleteAndCount(db: Database, table: SQLiteTable, where: SQL): Promise<number> {
  const [row] = await db.select({ value: count() }).from(table).where(where);
  await db.delete(table).where(where);
  return row?.value ?? 0;
}

/**
 * The periodic housekeeping: expired demo workspaces (with the guest accounts that owned them),
 * files nothing points to, audit entries past their retention, and expired sessions and tokens.
 * Safe to run at any time and as often as wanted; every step is independent.
 */
export async function runMaintenance({
  db,
  storage,
  now = new Date(),
  auditRetentionDays = 365,
  orphanGraceMinutes = 60,
}: MaintenanceDeps): Promise<MaintenanceReport> {
  const report: MaintenanceReport = {
    expiredDemoOrganizations: 0,
    anonymousUsersRemoved: 0,
    orphanFilesSwept: 0,
    auditEntriesPurged: 0,
    expiredSessionsPurged: 0,
    expiredVerificationsPurged: 0,
    rateLimitCountersPurged: 0,
  };

  // 1. Expired demos.
  const expired = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.isDemo, true), lt(organizations.demoExpiresAt, now)));
  const guestIds = new Set<string>();
  for (const { id } of expired) {
    try {
      const { deleted, ownerIds } = await deleteDemoOrganization({ db, storage }, id);
      if (!deleted) continue;
      report.expiredDemoOrganizations += 1;
      ownerIds.forEach((userId) => guestIds.add(userId));
    } catch (error) {
      console.error(`Could not delete the demo organization ${id}`, error);
    }
  }
  if (guestIds.size > 0) {
    // Only guests that have nowhere left to work: a guest who signed up for real is not anonymous any more.
    for (const ids of chunk([...guestIds], D1_MAX_PARAMETERS - 10)) {
      report.anonymousUsersRemoved += await deleteAndCount(
        db,
        users,
        and(
          inArray(users.id, ids),
          eq(users.isAnonymous, true),
          notExists(db.select({ one: members.id }).from(members).where(eq(members.userId, users.id))),
        )!,
      );
    }
  }

  // 2. Files that nothing points to (includes what deleted properties left behind).
  report.orphanFilesSwept = await sweepOrphanFiles(db, storage, {
    olderThan: new Date(now.getTime() - orphanGraceMinutes * 60_000),
  });

  // 3. Audit retention.
  report.auditEntriesPurged = await createAuditRepository(db).deleteOlderThan(new Date(now.getTime() - auditRetentionDays * DAY_MS));

  // 4. Expired sessions and verification tokens.
  report.expiredSessionsPurged = await deleteAndCount(db, sessions, lt(sessions.expiresAt, now));
  report.expiredVerificationsPurged = await deleteAndCount(db, verifications, lt(verifications.expiresAt, now));

  // 5. Rate limit counters: the longest window is an hour, so a day-old row never matters again.
  report.rateLimitCountersPurged = await deleteAndCount(db, rateLimits, lt(rateLimits.lastRequest, now.getTime() - DAY_MS));

  return report;
}

export interface MaintenanceJobOptions extends MaintenanceDeps {
  intervalMinutes: number;
  log?: (message: string) => void;
  /** The work of each tick; replaceable in tests. */
  run?: (deps: MaintenanceDeps) => Promise<MaintenanceReport>;
}

/**
 * Runs the maintenance now and then every `intervalMinutes`. A run that is still going when the
 * next tick arrives makes that tick a no-op, so runs never overlap. Returns a function that stops it.
 */
export function startMaintenanceJob({
  intervalMinutes,
  log = console.log,
  run = runMaintenance,
  ...deps
}: MaintenanceJobOptions): () => void {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const report = await run({ ...deps, now: new Date() });
      const worked = Object.values(report).some((count) => count > 0);
      if (worked) log(`Maintenance: ${JSON.stringify(report)}`);
    } catch (error) {
      console.error("Maintenance run failed", error);
    } finally {
      running = false;
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), intervalMinutes * 60_000);
  // Do not keep the process alive just for the job.
  timer.unref();
  return () => clearInterval(timer);
}
