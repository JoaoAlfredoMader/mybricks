import { type SQL, and, asc, count, desc, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "../../db/database.js";
import type {
  AdjustmentIndex,
  ContractStatus,
  ContractType,
  RentalMode,
  UsageType,
} from "../../db/enums.js";
import { constraintViolation } from "../../db/errors.js";
import { contractRentTerms, contracts, occupants, properties } from "../../db/schema.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { OccupantRef } from "../occupants/occupant-input.js";
import { createOccupantLookup, type OccupantLookup } from "../occupants/occupants.repository.js";

type ContractRow = typeof contracts.$inferSelect;

export type ContractRecord = Pick<
  ContractRow,
  | "id"
  | "propertyId"
  | "contractType"
  | "status"
  | "startDate"
  | "endDate"
  | "notes"
  | "pdfFileId"
  | "createdAt"
  | "updatedAt"
> & {
  property: { name: string };
  occupant: { id: string; name: string; document: string | null; email: string | null; phone: string | null };
  rentTerms: { monthlyRentCents: bigint; dueDay: number; adjustmentIndex: AdjustmentIndex | null } | null;
};

const withRelations = {
  columns: {
    id: true,
    propertyId: true,
    contractType: true,
    status: true,
    startDate: true,
    endDate: true,
    notes: true,
    pdfFileId: true,
    createdAt: true,
    updatedAt: true,
  },
  with: {
    property: { columns: { name: true } },
    occupant: { columns: { id: true, name: true, document: true, email: true, phone: true } },
    rentTerms: { columns: { monthlyRentCents: true, dueDay: true, adjustmentIndex: true } },
  },
} as const;

/** Every query is bound to one organization; members only reach contracts of properties they created. */
export interface ContractScope {
  organizationId: string;
  propertyCreatedById?: string;
}

export interface RentTermsData {
  monthlyRentCents: bigint;
  dueDay: number;
  adjustmentIndex: AdjustmentIndex | null;
}

export interface NewContractData {
  propertyId: string;
  contractType: ContractType;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  /** A conventional contract has rent terms; a short-stay one never does. */
  rentTerms: RentTermsData | null;
  occupant: OccupantRef;
}

export interface ContractPatch {
  endDate?: Date | null;
  notes?: string | null;
  rentTerms?: Partial<RentTermsData>;
}

export interface PropertyForContract {
  id: string;
  usageType: UsageType;
  rentalMode: RentalMode;
}

export interface ContractListQuery {
  propertyId?: string;
  status?: ContractStatus;
  contractType?: ContractType;
  skip: number;
  take: number;
}

export interface ContractsRepository extends OccupantLookup {
  list(scope: ContractScope, query: ContractListQuery): Promise<{ items: ContractRecord[]; total: number }>;
  findById(scope: ContractScope, id: string): Promise<ContractRecord | null>;
  /**
   * Creates the contract. If the property already has an active contract it is ended in the same
   * batch (its end date is moved to the new start when that shortens it), so the "one active
   * contract per property" index is never violated. Returns the replaced contract id, if any.
   */
  create(
    scope: ContractScope,
    data: NewContractData,
  ): Promise<{ contract: ContractRecord; replacedContractId: string | null }>;
  update(scope: ContractScope, id: string, patch: ContractPatch): Promise<ContractRecord | null>;
  /** Moves an ACTIVE contract to a final status. Returns false when it was not active. */
  close(
    scope: ContractScope,
    id: string,
    change: { status: "ended" | "cancelled"; endDate?: Date },
  ): Promise<boolean>;

  findProperty(scope: ContractScope, propertyId: string): Promise<PropertyForContract | null>;
}

/** The scope as a condition on `contracts`: the organization and, for members, the properties they created. */
function whereFor(db: Database, scope: ContractScope): SQL {
  const visible = scope.propertyCreatedById
    ? inArray(
        contracts.propertyId,
        db.select({ id: properties.id }).from(properties).where(eq(properties.createdById, scope.propertyCreatedById)),
      )
    : undefined;
  return and(eq(contracts.organizationId, scope.organizationId), visible)!;
}

/** `(organization_id, document)` is unique on occupants: a concurrent create with the same document loses. */
function translateWriteError(error: unknown): never {
  const violation = constraintViolation(error);
  if (violation?.kind === "unique") {
    if (violation.columns.includes("document")) {
      throw AppError.conflict("An occupant with this document already exists", { field: "occupant.document" });
    }
    // The only other unique index a contract insert can hit: one active contract per property.
    throw AppError.conflict("The property already has an active contract");
  }
  throw error;
}

type Statements = [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]];

/** Repository layer: the only place that talks to the database. */
export function createContractsRepository(db: Database): ContractsRepository {
  async function findById(scope: ContractScope, id: string): Promise<ContractRecord | null> {
    const row = await db.query.contracts.findFirst({
      ...withRelations,
      where: and(whereFor(db, scope), eq(contracts.id, id)),
    });
    return row ?? null;
  }

  return {
    async list(scope, { propertyId, status, contractType, skip, take }) {
      const conditions: SQL[] = [whereFor(db, scope)];
      if (propertyId) conditions.push(eq(contracts.propertyId, propertyId));
      if (status) conditions.push(eq(contracts.status, status));
      if (contractType) conditions.push(eq(contracts.contractType, contractType));
      const where = and(...conditions);

      const [items, [totalRow]] = await Promise.all([
        db.query.contracts.findMany({
          ...withRelations,
          where,
          orderBy: [desc(contracts.startDate), asc(contracts.id)],
          limit: take,
          offset: skip,
        }),
        db.select({ value: count() }).from(contracts).where(where),
      ]);
      return { items, total: totalRow?.value ?? 0 };
    },

    findById,

    async create(scope, data) {
      // The active contract is read first; one batch then ends it and inserts the new one. If another
      // request activated a contract in between, `uq_contracts_one_active_per_property` refuses the
      // insert and the whole batch (including ending the old contract) is rolled back.
      const [active] = await db
        .select({ id: contracts.id, startDate: contracts.startDate, endDate: contracts.endDate })
        .from(contracts)
        .where(
          and(
            eq(contracts.organizationId, scope.organizationId),
            eq(contracts.propertyId, data.propertyId),
            eq(contracts.status, "active"),
          ),
        )
        .limit(1);

      const contractId = crypto.randomUUID();
      const occupantId = "existingId" in data.occupant ? data.occupant.existingId : crypto.randomUUID();

      const statements: BatchItem<"sqlite">[] = [];
      if (active) {
        const shorten =
          data.startDate > active.startDate && (active.endDate === null || active.endDate > data.startDate);
        statements.push(
          db
            .update(contracts)
            .set({ status: "ended", updatedAt: new Date(), ...(shorten ? { endDate: data.startDate } : {}) })
            .where(eq(contracts.id, active.id)),
        );
      }
      if ("create" in data.occupant) {
        statements.push(
          db.insert(occupants).values({ ...data.occupant.create, id: occupantId, organizationId: scope.organizationId }),
        );
      }
      statements.push(
        db.insert(contracts).values({
          id: contractId,
          organizationId: scope.organizationId,
          propertyId: data.propertyId,
          occupantId,
          contractType: data.contractType,
          startDate: data.startDate,
          endDate: data.endDate,
          notes: data.notes,
        }),
      );
      if (data.rentTerms) {
        statements.push(
          db.insert(contractRentTerms).values({ contractId, contractType: data.contractType, ...data.rentTerms }),
        );
      }

      try {
        await db.batch(statements as Statements);
      } catch (error) {
        return translateWriteError(error);
      }
      const contract = await findById(scope, contractId);
      return { contract: contract!, replacedContractId: active?.id ?? null };
    },

    async update(scope, id, { rentTerms, ...patch }) {
      if (!(await findById(scope, id))) return null;

      const statements: Statements = [
        db
          .update(contracts)
          .set({ ...patch, updatedAt: new Date() })
          .where(and(whereFor(db, scope), eq(contracts.id, id))),
      ];
      if (rentTerms && Object.keys(rentTerms).length > 0) {
        statements.push(db.update(contractRentTerms).set(rentTerms).where(eq(contractRentTerms.contractId, id)));
      }
      await db.batch(statements);
      return findById(scope, id);
    },

    async close(scope, id, { status, endDate }) {
      const closed = await db
        .update(contracts)
        .set({ status, updatedAt: new Date(), ...(endDate ? { endDate } : {}) })
        .where(and(whereFor(db, scope), eq(contracts.id, id), eq(contracts.status, "active")))
        .returning({ id: contracts.id });
      return closed.length > 0;
    },

    async findProperty(scope, propertyId) {
      const [property] = await db
        .select({ id: properties.id, usageType: properties.usageType, rentalMode: properties.rentalMode })
        .from(properties)
        .where(
          and(
            eq(properties.id, propertyId),
            eq(properties.organizationId, scope.organizationId),
            scope.propertyCreatedById ? eq(properties.createdById, scope.propertyCreatedById) : undefined,
          ),
        );
      return property ?? null;
    },

    ...createOccupantLookup(db),
  };
}
