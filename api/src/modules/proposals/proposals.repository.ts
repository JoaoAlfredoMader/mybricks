import { type SQL, and, asc, count, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import type { ProposalType } from "../../db/enums.js";
import { properties, propertyProposals } from "../../db/schema.js";

export type ProposalRecord = typeof propertyProposals.$inferSelect;

/** Proposals belong to a property: members only reach those of properties they created. */
export interface ProposalScope {
  organizationId: string;
  propertyCreatedById?: string;
}

export interface ProposalData {
  proposalType: ProposalType;
  amountCents: bigint;
  proposalDate: Date;
  contact: string | null;
  notes: string | null;
}

export interface ProposalsRepository {
  propertyVisible(scope: ProposalScope, propertyId: string): Promise<boolean>;
  list(
    scope: ProposalScope,
    propertyId: string,
    query: { proposalType?: ProposalType; skip: number; take: number },
  ): Promise<{ items: ProposalRecord[]; total: number }>;
  findById(scope: ProposalScope, propertyId: string, id: string): Promise<ProposalRecord | null>;
  create(propertyId: string, data: ProposalData): Promise<ProposalRecord>;
  update(scope: ProposalScope, propertyId: string, id: string, patch: Partial<ProposalData>): Promise<ProposalRecord | null>;
  delete(scope: ProposalScope, propertyId: string, id: string): Promise<boolean>;
}

/** Repository layer: the only place that talks to the database. */
export function createProposalsRepository(db: Database): ProposalsRepository {
  const propertyScope = (scope: ProposalScope): SQL =>
    and(
      eq(properties.organizationId, scope.organizationId),
      scope.propertyCreatedById ? eq(properties.createdById, scope.propertyCreatedById) : undefined,
    ) as SQL;

  /** The proposal is reached through its property, so the tenant and visibility filter sit on the property. */
  const whereFor = (scope: ProposalScope, propertyId: string): SQL =>
    and(
      eq(propertyProposals.propertyId, propertyId),
      inArray(propertyProposals.propertyId, db.select({ id: properties.id }).from(properties).where(propertyScope(scope))),
    ) as SQL;

  async function findById(scope: ProposalScope, propertyId: string, id: string): Promise<ProposalRecord | null> {
    const [row] = await db.select().from(propertyProposals).where(and(whereFor(scope, propertyId), eq(propertyProposals.id, id)));
    return row ?? null;
  }

  return {
    async propertyVisible(scope, propertyId) {
      const [row] = await db.select({ id: properties.id }).from(properties).where(and(propertyScope(scope), eq(properties.id, propertyId)));
      return row !== undefined;
    },

    async list(scope, propertyId, { proposalType, skip, take }) {
      const where = and(whereFor(scope, propertyId), proposalType ? eq(propertyProposals.proposalType, proposalType) : undefined) as SQL;
      const [items, [total]] = await Promise.all([
        db
          .select()
          .from(propertyProposals)
          .where(where)
          .orderBy(desc(propertyProposals.proposalDate), desc(propertyProposals.createdAt), asc(propertyProposals.id))
          .limit(take)
          .offset(skip),
        db.select({ value: count() }).from(propertyProposals).where(where),
      ]);
      return { items, total: total?.value ?? 0 };
    },

    findById,

    async create(propertyId, data) {
      const [created] = await db.insert(propertyProposals).values({ ...data, propertyId }).returning();
      if (!created) throw new Error("The proposal that was just created could not be read back");
      return created;
    },

    async update(scope, propertyId, id, patch) {
      // `.set()` refuses an empty object; an empty patch changes nothing and just answers with the row.
      if (Object.values(patch).every((value) => value === undefined)) return findById(scope, propertyId, id);
      const [row] = await db
        .update(propertyProposals)
        .set(patch)
        .where(and(whereFor(scope, propertyId), eq(propertyProposals.id, id)))
        .returning();
      return row ?? null;
    },

    async delete(scope, propertyId, id) {
      const removed = await db
        .delete(propertyProposals)
        .where(and(whereFor(scope, propertyId), eq(propertyProposals.id, id)))
        .returning({ id: propertyProposals.id });
      return removed.length > 0;
    },
  };
}
