import { type SQL, and, asc, count, desc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "../../db/database.js";
import type { ContractStatus, ContractType, ReservationStatus, UsageType } from "../../db/enums.js";
import { constraintViolation } from "../../db/errors.js";
import { contracts, occupants, properties, reservations } from "../../db/schema.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { OccupantRef } from "../occupants/occupant-input.js";
import { createOccupantLookup, type OccupantLookup } from "../occupants/occupants.repository.js";

type ReservationRow = typeof reservations.$inferSelect;

export type ReservationRecord = Pick<
  ReservationRow,
  | "id"
  | "propertyId"
  | "contractId"
  | "checkIn"
  | "checkOut"
  | "totalAmountCents"
  | "status"
  | "notes"
  | "createdAt"
  | "updatedAt"
> & {
  property: { name: string };
  occupant: { id: string; name: string; document: string | null; email: string | null; phone: string | null };
};

const withRelations = {
  columns: {
    id: true,
    propertyId: true,
    contractId: true,
    checkIn: true,
    checkOut: true,
    totalAmountCents: true,
    status: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
  },
  with: {
    property: { columns: { name: true } },
    occupant: { columns: { id: true, name: true, document: true, email: true, phone: true } },
  },
} as const;

/** Every query is bound to one organization; members only reach reservations of properties they created. */
export interface ReservationScope {
  organizationId: string;
  propertyCreatedById?: string;
}

export interface NewReservationData {
  propertyId: string;
  contractId: string | null;
  checkIn: Date;
  checkOut: Date;
  totalAmountCents: bigint;
  notes: string | null;
  guest: OccupantRef;
}

export interface ReservationPatch {
  checkIn?: Date;
  checkOut?: Date;
  totalAmountCents?: bigint;
  contractId?: string | null;
  notes?: string | null;
}

export interface ReservationListQuery {
  propertyId?: string;
  contractId?: string;
  status?: ReservationStatus;
  /** Keep the reservations that overlap the window [from, to). */
  from?: Date;
  to?: Date;
  skip: number;
  take: number;
}

export interface PropertyForReservation {
  id: string;
  usageType: UsageType;
}

export interface ContractForReservation {
  id: string;
  propertyId: string;
  contractType: ContractType;
  status: ContractStatus;
  startDate: Date;
  endDate: Date | null;
}

export interface StayWindow {
  id: string;
  checkIn: Date;
  checkOut: Date;
}

export interface ReservationsRepository extends OccupantLookup {
  list(scope: ReservationScope, query: ReservationListQuery): Promise<{ items: ReservationRecord[]; total: number }>;
  findById(scope: ReservationScope, id: string): Promise<ReservationRecord | null>;
  create(scope: ReservationScope, data: NewReservationData): Promise<ReservationRecord>;
  /** Only touches a confirmed reservation. Returns null when it is missing or not confirmed. */
  update(scope: ReservationScope, id: string, patch: ReservationPatch): Promise<ReservationRecord | null>;
  /** Returns false when the reservation was not confirmed. */
  cancel(scope: ReservationScope, id: string): Promise<boolean>;

  findProperty(scope: ReservationScope, propertyId: string): Promise<PropertyForReservation | null>;
  findContract(organizationId: string, contractId: string): Promise<ContractForReservation | null>;
  /** A confirmed reservation of the property that overlaps [checkIn, checkOut). Same-day turnover does not overlap. */
  findOverlapping(
    propertyId: string,
    window: { checkIn: Date; checkOut: Date },
    excludeId?: string,
  ): Promise<StayWindow | null>;
}

/** The scope as a condition on `reservations`: the organization and, for members, the properties they created. */
function whereFor(db: Database, scope: ReservationScope): SQL {
  const visible = scope.propertyCreatedById
    ? inArray(
        reservations.propertyId,
        db.select({ id: properties.id }).from(properties).where(eq(properties.createdById, scope.propertyCreatedById)),
      )
    : undefined;
  return and(eq(reservations.organizationId, scope.organizationId), visible)!;
}

/**
 * The database refuses overlapping confirmed reservations (trigger `reservation_overlap`).
 * The service checks first for a friendly message; this covers two requests racing for the same dates.
 */
function translateWriteError(error: unknown): never {
  if (constraintViolation(error)?.kind === "overlap") {
    throw AppError.conflict("The property already has a confirmed reservation in these dates");
  }
  throw error;
}

type Statements = [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]];

/** Repository layer: the only place that talks to the database. */
export function createReservationsRepository(db: Database): ReservationsRepository {
  async function findById(scope: ReservationScope, id: string): Promise<ReservationRecord | null> {
    const row = await db.query.reservations.findFirst({
      ...withRelations,
      where: and(whereFor(db, scope), eq(reservations.id, id)),
    });
    return row ?? null;
  }

  return {
    async list(scope, { propertyId, contractId, status, from, to, skip, take }) {
      const conditions: SQL[] = [whereFor(db, scope)];
      if (propertyId) conditions.push(eq(reservations.propertyId, propertyId));
      if (contractId) conditions.push(eq(reservations.contractId, contractId));
      if (status) conditions.push(eq(reservations.status, status));
      if (from) conditions.push(gt(reservations.checkOut, from));
      if (to) conditions.push(lt(reservations.checkIn, to));
      const where = and(...conditions);

      const [items, [totalRow]] = await Promise.all([
        db.query.reservations.findMany({
          ...withRelations,
          where,
          orderBy: [desc(reservations.checkIn), asc(reservations.id)],
          limit: take,
          offset: skip,
        }),
        db.select({ value: count() }).from(reservations).where(where),
      ]);
      return { items, total: totalRow?.value ?? 0 };
    },

    findById,

    async create(scope, data) {
      const reservationId = crypto.randomUUID();
      const occupantId = "existingId" in data.guest ? data.guest.existingId : crypto.randomUUID();

      const statements: BatchItem<"sqlite">[] = [];
      if ("create" in data.guest) {
        statements.push(
          db.insert(occupants).values({ ...data.guest.create, id: occupantId, organizationId: scope.organizationId }),
        );
      }
      statements.push(
        db.insert(reservations).values({
          id: reservationId,
          organizationId: scope.organizationId,
          propertyId: data.propertyId,
          occupantId,
          // The composite FK (contract_id, property_id) makes sure the contract belongs to the same property.
          contractId: data.contractId,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          totalAmountCents: data.totalAmountCents,
          notes: data.notes,
        }),
      );
      try {
        await db.batch(statements as Statements);
      } catch (error) {
        return translateWriteError(error);
      }
      return (await findById(scope, reservationId))!;
    },

    async update(scope, id, patch) {
      try {
        const updated = await db
          .update(reservations)
          .set({ ...patch, updatedAt: new Date() })
          .where(and(whereFor(db, scope), eq(reservations.id, id), eq(reservations.status, "confirmed")))
          .returning({ id: reservations.id });
        if (updated.length === 0) return null;
      } catch (error) {
        return translateWriteError(error);
      }
      return findById(scope, id);
    },

    async cancel(scope, id) {
      const cancelled = await db
        .update(reservations)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(and(whereFor(db, scope), eq(reservations.id, id), eq(reservations.status, "confirmed")))
        .returning({ id: reservations.id });
      return cancelled.length > 0;
    },

    async findProperty(scope, propertyId) {
      const [property] = await db
        .select({ id: properties.id, usageType: properties.usageType })
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

    async findContract(organizationId, contractId) {
      const [contract] = await db
        .select({
          id: contracts.id,
          propertyId: contracts.propertyId,
          contractType: contracts.contractType,
          status: contracts.status,
          startDate: contracts.startDate,
          endDate: contracts.endDate,
        })
        .from(contracts)
        .where(and(eq(contracts.id, contractId), eq(contracts.organizationId, organizationId)));
      return contract ?? null;
    },

    async findOverlapping(propertyId, { checkIn, checkOut }, excludeId) {
      const [clash] = await db
        .select({ id: reservations.id, checkIn: reservations.checkIn, checkOut: reservations.checkOut })
        .from(reservations)
        .where(
          and(
            eq(reservations.propertyId, propertyId),
            eq(reservations.status, "confirmed"),
            lt(reservations.checkIn, checkOut),
            gt(reservations.checkOut, checkIn),
            excludeId ? ne(reservations.id, excludeId) : undefined,
          ),
        )
        .limit(1);
      return clash ?? null;
    },

    ...createOccupantLookup(db),
  };
}
