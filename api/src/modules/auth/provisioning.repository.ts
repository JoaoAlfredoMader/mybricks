import { and, asc, count, eq, inArray } from "drizzle-orm";
import { atomic } from "../../db/atomic.js";
import type { Database } from "../../db/database.js";
import { clients, members, occupants, organizations, properties, sessions, storedFiles } from "../../db/schema.js";

export interface NewOrganization {
  name: string;
  slug: string;
  ownerId: string;
  isDemo: boolean;
  demoExpiresAt: Date | null;
}

export interface ProvisioningRepository {
  createOrganizationWithOwner(input: NewOrganization): Promise<{ id: string }>;
  findFirstOrganizationId(userId: string): Promise<string | null>;
  findMemberRole(organizationId: string, userId: string): Promise<string | null>;
  /** Points every session of the user to the organization (sessions are created before provisioning runs). */
  setActiveOrganizationForSessions(userId: string, organizationId: string): Promise<void>;
  /**
   * Moves the guest's demo workspace to the real account the guest just created:
   * the empty personal organization of the new user is dropped, the memberships are
   * transferred (authorship foreign keys follow through ON UPDATE CASCADE), the demo flag
   * is cleared and the new user's sessions point to the adopted organization.
   */
  adoptDemoOrganization(input: { anonymousUserId: string; newUserId: string; organizationName: string }): Promise<string | null>;
}

/** Repository layer: the only place of the auth module that talks to the database. */
export function createProvisioningRepository(db: Database): ProvisioningRepository {
  return {
    async createOrganizationWithOwner({ name, slug, ownerId, isDemo, demoExpiresAt }) {
      const id = crypto.randomUUID();
      // One batch: an organization is never left without its owner.
      await atomic(db, [
        db.insert(organizations).values({ id, name, slug, isDemo, demoExpiresAt }),
        db.insert(members).values({ organizationId: id, userId: ownerId, role: "owner" }),
      ]);
      return { id };
    },

    async findFirstOrganizationId(userId) {
      const [membership] = await db
        .select({ organizationId: members.organizationId })
        .from(members)
        .where(eq(members.userId, userId))
        .orderBy(asc(members.createdAt))
        .limit(1);
      return membership?.organizationId ?? null;
    },

    async findMemberRole(organizationId, userId) {
      const [membership] = await db
        .select({ role: members.role })
        .from(members)
        .where(and(eq(members.organizationId, organizationId), eq(members.userId, userId)));
      return membership?.role ?? null;
    },

    async setActiveOrganizationForSessions(userId, organizationId) {
      await db.update(sessions).set({ activeOrganizationId: organizationId }).where(eq(sessions.userId, userId));
    },

    async adoptDemoOrganization({ anonymousUserId, newUserId, organizationName }) {
      const [demo] = await db
        .select({ organizationId: members.organizationId })
        .from(members)
        .innerJoin(organizations, eq(organizations.id, members.organizationId))
        .where(and(eq(members.userId, anonymousUserId), eq(organizations.isDemo, true)))
        .orderBy(asc(members.createdAt))
        .limit(1);
      if (!demo) return null;

      // The new user's own personal organizations that are still empty are dropped.
      const personal = await db
        .select({ organizationId: members.organizationId })
        .from(members)
        .innerJoin(organizations, eq(organizations.id, members.organizationId))
        .where(and(eq(members.userId, newUserId), eq(members.role, "owner"), eq(organizations.isDemo, false)));
      const empty: string[] = [];
      for (const { organizationId } of personal) {
        const counts = await Promise.all(
          [properties, clients, occupants, storedFiles].map(async (table) => {
            const [row] = await db.select({ value: count() }).from(table).where(eq(table.organizationId, organizationId));
            return row?.value ?? 0;
          }),
        );
        if (counts.every((value) => value === 0)) empty.push(organizationId);
      }

      // The reads above are outside the batch: nothing else touches a brand-new account in between.
      await atomic(db, [
        db.delete(organizations).where(inArray(organizations.id, empty.length ? empty : [""])),
        db.update(members).set({ userId: newUserId }).where(eq(members.userId, anonymousUserId)),
        db
          .update(organizations)
          .set({ isDemo: false, demoExpiresAt: null, name: organizationName })
          .where(eq(organizations.id, demo.organizationId)),
        db.update(sessions).set({ activeOrganizationId: demo.organizationId }).where(eq(sessions.userId, newUserId)),
      ]);
      return demo.organizationId;
    },
  };
}
