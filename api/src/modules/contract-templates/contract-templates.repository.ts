import { eq } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import { contractTemplates } from "../../db/schema.js";

export interface TemplateRecord {
  header: string;
  clauses: string;
  footer: string;
  updatedById: string | null;
  updatedAt: Date;
}

export interface TemplateData {
  header: string;
  clauses: string;
  footer: string;
}

export interface ContractTemplatesRepository {
  find(organizationId: string): Promise<TemplateRecord | null>;
  save(organizationId: string, updatedById: string, data: TemplateData): Promise<TemplateRecord>;
  /** Returns whether the organization had a template of its own. */
  delete(organizationId: string): Promise<boolean>;
}

const columns = {
  header: contractTemplates.header,
  clauses: contractTemplates.clauses,
  footer: contractTemplates.footer,
  updatedById: contractTemplates.updatedById,
  updatedAt: contractTemplates.updatedAt,
};

/** Repository layer: the only place that talks to the database. One template per organization. */
export function createContractTemplatesRepository(db: Database): ContractTemplatesRepository {
  return {
    async find(organizationId) {
      const [row] = await db.select(columns).from(contractTemplates).where(eq(contractTemplates.organizationId, organizationId));
      return row ?? null;
    },

    async save(organizationId, updatedById, data) {
      const [row] = await db
        .insert(contractTemplates)
        .values({ organizationId, updatedById, ...data })
        .onConflictDoUpdate({
          target: contractTemplates.organizationId,
          set: { updatedById, ...data, updatedAt: new Date() },
        })
        .returning(columns);
      return row!;
    },

    async delete(organizationId) {
      const removed = await db
        .delete(contractTemplates)
        .where(eq(contractTemplates.organizationId, organizationId))
        .returning({ organizationId: contractTemplates.organizationId });
      return removed.length > 0;
    },
  };
}
