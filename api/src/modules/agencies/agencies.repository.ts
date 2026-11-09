import { and, asc, count, eq } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import { isUniqueViolation } from "../../db/errors.js";
import { containsInsensitive } from "../../db/helpers.js";
import { agencies, properties } from "../../db/schema.js";
import { AppError } from "../../shared/errors/app-error.js";

export interface AgencyRecord {
  id: string;
  name: string;
}

export interface AgenciesRepository {
  list(
    organizationId: string,
    query: { search?: string; skip: number; take: number },
  ): Promise<{ items: AgencyRecord[]; total: number }>;
  findById(organizationId: string, id: string): Promise<AgencyRecord | null>;
  create(organizationId: string, name: string): Promise<AgencyRecord>;
  update(organizationId: string, id: string, name: string): Promise<AgencyRecord | null>;
  countProperties(organizationId: string, id: string): Promise<number>;
  delete(organizationId: string, id: string): Promise<boolean>;
}

const columns = { id: agencies.id, name: agencies.name };

/** `(organization_id, name)` is unique: two agencies with the same name are a conflict. */
function translateWriteError(error: unknown): never {
  if (isUniqueViolation(error, "name")) {
    throw AppError.conflict("An agency with this name already exists", { field: "name" });
  }
  throw error;
}

/** Repository layer: the only place that talks to the database. Agencies belong to the organization, not to a member. */
export function createAgenciesRepository(db: Database): AgenciesRepository {
  return {
    async list(organizationId, { search, skip, take }) {
      const where = and(
        eq(agencies.organizationId, organizationId),
        search ? containsInsensitive(agencies.name, search) : undefined,
      );
      const [items, [totalRow]] = await Promise.all([
        db.select(columns).from(agencies).where(where).orderBy(asc(agencies.name), asc(agencies.id)).limit(take).offset(skip),
        db.select({ value: count() }).from(agencies).where(where),
      ]);
      return { items, total: totalRow?.value ?? 0 };
    },

    async findById(organizationId, id) {
      const [row] = await db
        .select(columns)
        .from(agencies)
        .where(and(eq(agencies.id, id), eq(agencies.organizationId, organizationId)))
        .limit(1);
      return row ?? null;
    },

    async create(organizationId, name) {
      try {
        const [row] = await db.insert(agencies).values({ organizationId, name }).returning(columns);
        return row!;
      } catch (error) {
        return translateWriteError(error);
      }
    },

    async update(organizationId, id, name) {
      try {
        const [row] = await db
          .update(agencies)
          .set({ name })
          .where(and(eq(agencies.id, id), eq(agencies.organizationId, organizationId)))
          .returning(columns);
        return row ?? null;
      } catch (error) {
        return translateWriteError(error);
      }
    },

    async countProperties(organizationId, id) {
      const [row] = await db
        .select({ value: count() })
        .from(properties)
        .where(and(eq(properties.organizationId, organizationId), eq(properties.agencyId, id)));
      return row?.value ?? 0;
    },

    async delete(organizationId, id) {
      const removed = await db
        .delete(agencies)
        .where(and(eq(agencies.id, id), eq(agencies.organizationId, organizationId)))
        .returning({ id: agencies.id });
      return removed.length > 0;
    },
  };
}
