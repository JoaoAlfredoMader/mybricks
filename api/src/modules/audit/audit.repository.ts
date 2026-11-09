import { type SQL, and, count, desc, eq, gte, lt } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import type { AuditAction, AuditEntityType } from "../../db/enums.js";
import { auditLogs } from "../../db/schema.js";

export type AuditRecord = typeof auditLogs.$inferSelect;

/** One entry of the trail. The actor is a snapshot: it stays readable after the user is gone. */
export interface AuditEntry {
  organizationId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  impersonatedById: string | null;
  action: AuditAction;
  entityType: AuditEntityType | null;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuditFilter {
  /** `undefined` = every organization (platform operator). */
  organizationId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  actorUserId?: string;
  /** Inclusive lower bound and exclusive upper bound on `createdAt`. */
  from?: Date;
  to?: Date;
}

export interface AuditRepository {
  create(entry: AuditEntry): Promise<void>;
  list(filter: AuditFilter, page: { skip: number; take: number }): Promise<{ items: AuditRecord[]; total: number }>;
  /** Retention: removes everything older than the date. Returns how many entries were removed. */
  deleteOlderThan(date: Date): Promise<number>;
}

/** Repository layer: the only place that talks to the database. */
export function createAuditRepository(db: Database): AuditRepository {
  return {
    async create(entry) {
      await db.insert(auditLogs).values(entry);
    },

    async list(filter, { skip, take }) {
      const conditions: SQL[] = [];
      if (filter.organizationId) conditions.push(eq(auditLogs.organizationId, filter.organizationId));
      if (filter.action) conditions.push(eq(auditLogs.action, filter.action));
      if (filter.entityType) conditions.push(eq(auditLogs.entityType, filter.entityType));
      if (filter.actorUserId) conditions.push(eq(auditLogs.actorUserId, filter.actorUserId));
      if (filter.from) conditions.push(gte(auditLogs.createdAt, filter.from));
      if (filter.to) conditions.push(lt(auditLogs.createdAt, filter.to));
      const where = conditions.length ? and(...conditions) : undefined;

      const [items, [totalRow]] = await Promise.all([
        db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(take).offset(skip),
        db.select({ value: count() }).from(auditLogs).where(where),
      ]);
      return { items, total: totalRow?.value ?? 0 };
    },

    async deleteOlderThan(date) {
      const removed = await db.delete(auditLogs).where(lt(auditLogs.createdAt, date)).returning({ id: auditLogs.id });
      return removed.length;
    },
  };
}
