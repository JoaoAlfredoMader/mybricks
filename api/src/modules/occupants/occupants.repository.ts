import { type SQL, and, asc, count, eq, exists, or, sql } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import { containsInsensitive, containsSensitive } from "../../db/helpers.js";
import { contracts, occupants, properties, reservations } from "../../db/schema.js";

export interface OccupantRecord {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Occupants (tenants and guests) belong to the organization, not to a member. A member only sees
 * the ones that appear in contracts or reservations of properties they created.
 */
export interface OccupantScope {
  organizationId: string;
  visibleToUserId?: string;
}

export interface OccupantData {
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
}

/** What other modules need to know about stored occupants before attaching one to a record. */
export interface OccupantLookup {
  occupantExists(organizationId: string, occupantId: string): Promise<boolean>;
  findOccupantIdByDocument(organizationId: string, document: string): Promise<string | null>;
}

export function createOccupantLookup(db: Database): OccupantLookup {
  return {
    async occupantExists(organizationId, occupantId) {
      const [row] = await db
        .select({ id: occupants.id })
        .from(occupants)
        .where(and(eq(occupants.id, occupantId), eq(occupants.organizationId, organizationId)))
        .limit(1);
      return row !== undefined;
    },

    async findOccupantIdByDocument(organizationId, document) {
      const [row] = await db
        .select({ id: occupants.id })
        .from(occupants)
        .where(and(eq(occupants.organizationId, organizationId), eq(occupants.document, document)))
        .limit(1);
      return row?.id ?? null;
    },
  };
}

export interface OccupantsRepository {
  list(
    scope: OccupantScope,
    query: { search?: string; skip: number; take: number },
  ): Promise<{ items: OccupantRecord[]; total: number }>;
}

const columns = {
  id: occupants.id,
  name: occupants.name,
  document: occupants.document,
  email: occupants.email,
  phone: occupants.phone,
};

/** Repository layer: the only place that talks to the database. */
export function createOccupantsRepository(db: Database): OccupantsRepository {
  return {
    async list(scope, { search, skip, take }) {
      const conditions: SQL[] = [eq(occupants.organizationId, scope.organizationId)];
      if (scope.visibleToUserId) {
        const userId = scope.visibleToUserId;
        const visible = or(
          exists(
            db
              .select({ one: sql`1` })
              .from(contracts)
              .innerJoin(properties, eq(properties.id, contracts.propertyId))
              .where(and(eq(contracts.occupantId, occupants.id), eq(properties.createdById, userId))),
          ),
          exists(
            db
              .select({ one: sql`1` })
              .from(reservations)
              .innerJoin(properties, eq(properties.id, reservations.propertyId))
              .where(and(eq(reservations.occupantId, occupants.id), eq(properties.createdById, userId))),
          ),
        );
        if (visible) conditions.push(visible);
      }
      if (search) {
        const matches = or(
          containsInsensitive(occupants.name, search),
          containsSensitive(occupants.document, search.toUpperCase()),
          containsInsensitive(occupants.email, search),
        );
        if (matches) conditions.push(matches);
      }
      const where = and(...conditions);

      const [items, [totalRow]] = await Promise.all([
        db.select(columns).from(occupants).where(where).orderBy(asc(occupants.name), asc(occupants.id)).limit(take).offset(skip),
        db.select({ value: count() }).from(occupants).where(where),
      ]);
      return { items, total: totalRow?.value ?? 0 };
    },
  };
}
