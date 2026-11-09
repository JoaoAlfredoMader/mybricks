import { type SQL, and, asc, eq, gte, inArray, isNull, lte, ne, or, sum } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import type { ContractStatus, ContractType, RentalMode, TransactionType, UsageType } from "../../db/enums.js";
import { chunk } from "../../db/helpers.js";
import {
  contractRentTerms,
  contracts,
  properties,
  propertyAcquisitions,
  propertyManualRentals,
  reservations,
  transactionCategories,
  transactions,
} from "../../db/schema.js";
import { transactionPeriodFilter } from "../transactions/transaction-period.js";

/** Everything the KPI calculations need about one property, read in a single go. */
export interface PropertyKpiRecord {
  id: string;
  name: string;
  clientId: string | null;
  usageType: UsageType;
  rentalMode: RentalMode;
  ownershipPercentage: number;
  estimatedValueCents: bigint | null;
  annualExpensesCents: bigint;
  occupancyRate: number;
  manualRental: { tenantName: string | null; monthlyRentCents: bigint } | null;
  acquisition: { acquiredOn: Date | null; costCents: bigint | null } | null;
  activeContract: { contractType: ContractType; monthlyRentCents: bigint | null } | null;
  /** Sum of the confirmed reservations whose check-in falls in the window. */
  reservationsTotalCents: bigint;
  transactions: Array<{
    amountCents: bigint;
    occurredOn: Date;
    isRecurring: boolean;
    recurrenceEndsOn: Date | null;
    transactionType: TransactionType;
  }>;
}

/** Every query is bound to one organization; members only reach properties they created. */
export interface KpiScope {
  organizationId: string;
  createdById?: string;
}

export interface KpiQuery {
  propertyId?: string;
  clientId?: string;
  /** Reservations with check-in in `[reservationsFrom, reservationsTo]` count as realized revenue. */
  reservationsFrom: Date;
  reservationsTo: Date;
}

/** Everything the monthly cash flow needs about one property, already narrowed to the window. */
export interface CashFlowPropertyRecord {
  id: string;
  usageType: UsageType;
  rentalMode: RentalMode;
  ownershipPercentage: number;
  annualExpensesCents: bigint;
  occupancyRate: number;
  manualMonthlyRentCents: bigint | null;
  /** Conventional contracts that are not cancelled and may reach the window. */
  contracts: Array<{ status: ContractStatus; startDate: Date; endDate: Date | null; updatedAt: Date; monthlyRentCents: bigint }>;
  /** Confirmed reservations with check-in inside the window. */
  reservations: Array<{ checkIn: Date; totalAmountCents: bigint }>;
  /** One-off transactions inside the window and recurring ones whose occurrences touch it. */
  transactions: PropertyKpiRecord["transactions"];
}

export interface CashFlowQuery {
  propertyId?: string;
  /** First and last day of the window; whole months, both included. */
  from: Date;
  to: Date;
}

export interface KpisRepository {
  loadProperties(scope: KpiScope, query: KpiQuery): Promise<PropertyKpiRecord[]>;
  loadCashFlow(scope: KpiScope, query: CashFlowQuery): Promise<CashFlowPropertyRecord[]>;
}

/** Property ids go into IN (...) lists in chunks, so a statement never binds more than D1 allows (100 parameters). */
const ID_CHUNK = 80;

/** The properties the scope reaches. */
function propertyFilter(scope: KpiScope, extra: Array<SQL | undefined>): SQL {
  return and(
    eq(properties.organizationId, scope.organizationId),
    scope.createdById ? eq(properties.createdById, scope.createdById) : undefined,
    ...extra,
  )!;
}

/** Runs `load` for each chunk of ids and groups the rows by the property they belong to. */
async function loadByProperty<T extends { propertyId: string }>(
  ids: readonly string[],
  load: (ids: string[]) => Promise<T[]>,
): Promise<Map<string, T[]>> {
  const rows = (await Promise.all(chunk(ids, ID_CHUNK).map(load))).flat();
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const list = grouped.get(row.propertyId);
    if (list) list.push(row);
    else grouped.set(row.propertyId, [row]);
  }
  return grouped;
}

const transactionColumns = {
  propertyId: transactions.propertyId,
  amountCents: transactions.amountCents,
  occurredOn: transactions.occurredOn,
  isRecurring: transactions.isRecurring,
  recurrenceEndsOn: transactions.recurrenceEndsOn,
  transactionType: transactionCategories.transactionType,
};

function toTransaction({
  propertyId: _propertyId,
  ...transaction
}: { propertyId: string } & PropertyKpiRecord["transactions"][number]): PropertyKpiRecord["transactions"][number] {
  return transaction;
}

/** Repository layer: the only place that talks to the database. */
export function createKpisRepository(db: Database): KpisRepository {
  return {
    async loadProperties(scope, { propertyId, clientId, reservationsFrom, reservationsTo }) {
      const rows = await db
        .select({
          id: properties.id,
          name: properties.name,
          clientId: properties.clientId,
          usageType: properties.usageType,
          rentalMode: properties.rentalMode,
          ownershipPercentage: properties.ownershipPercentage,
          estimatedValueCents: properties.estimatedValueCents,
          annualExpensesCents: properties.annualExpensesCents,
          occupancyRate: properties.occupancyRate,
        })
        .from(properties)
        .where(
          propertyFilter(scope, [
            propertyId ? eq(properties.id, propertyId) : undefined,
            clientId ? eq(properties.clientId, clientId) : undefined,
          ]),
        )
        .orderBy(asc(properties.name), asc(properties.id));
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      const [manualRentals, acquisitions, activeContracts, transactionRows, booked] = await Promise.all([
        loadByProperty(ids, (chunkIds) =>
          db
            .select({
              propertyId: propertyManualRentals.propertyId,
              tenantName: propertyManualRentals.tenantName,
              monthlyRentCents: propertyManualRentals.monthlyRentCents,
            })
            .from(propertyManualRentals)
            .where(inArray(propertyManualRentals.propertyId, chunkIds)),
        ),
        loadByProperty(ids, (chunkIds) =>
          db
            .select({
              propertyId: propertyAcquisitions.propertyId,
              acquiredOn: propertyAcquisitions.acquiredOn,
              costCents: propertyAcquisitions.costCents,
            })
            .from(propertyAcquisitions)
            .where(inArray(propertyAcquisitions.propertyId, chunkIds)),
        ),
        // At most one active contract per property (partial unique index), with or without rent terms.
        loadByProperty(ids, (chunkIds) =>
          db
            .select({
              propertyId: contracts.propertyId,
              contractType: contracts.contractType,
              monthlyRentCents: contractRentTerms.monthlyRentCents,
            })
            .from(contracts)
            .leftJoin(contractRentTerms, eq(contractRentTerms.contractId, contracts.id))
            .where(and(inArray(contracts.propertyId, chunkIds), eq(contracts.status, "active"))),
        ),
        loadByProperty(ids, (chunkIds) =>
          db
            .select(transactionColumns)
            .from(transactions)
            .innerJoin(transactionCategories, eq(transactionCategories.id, transactions.categoryId))
            .where(inArray(transactions.propertyId, chunkIds)),
        ),
        Promise.all(
          chunk(ids, ID_CHUNK).map((chunkIds) =>
            db
              .select({ propertyId: reservations.propertyId, total: sum(reservations.totalAmountCents) })
              .from(reservations)
              .where(
                and(
                  inArray(reservations.propertyId, chunkIds),
                  eq(reservations.status, "confirmed"),
                  gte(reservations.checkIn, reservationsFrom),
                  lte(reservations.checkIn, reservationsTo),
                ),
              )
              .groupBy(reservations.propertyId),
          ),
        ),
      ]);
      const totals = new Map(booked.flat().map((entry) => [entry.propertyId, BigInt(entry.total ?? 0)]));

      return rows.map((row): PropertyKpiRecord => {
        const manualRental = manualRentals.get(row.id)?.[0];
        const acquisition = acquisitions.get(row.id)?.[0];
        const contract = activeContracts.get(row.id)?.[0];
        return {
          ...row,
          manualRental: manualRental
            ? { tenantName: manualRental.tenantName, monthlyRentCents: manualRental.monthlyRentCents }
            : null,
          acquisition: acquisition ? { acquiredOn: acquisition.acquiredOn, costCents: acquisition.costCents } : null,
          activeContract: contract ? { contractType: contract.contractType, monthlyRentCents: contract.monthlyRentCents } : null,
          reservationsTotalCents: totals.get(row.id) ?? 0n,
          transactions: (transactionRows.get(row.id) ?? []).map(toTransaction),
        };
      });
    },

    async loadCashFlow(scope, { propertyId, from, to }) {
      const rows = await db
        .select({
          id: properties.id,
          usageType: properties.usageType,
          rentalMode: properties.rentalMode,
          ownershipPercentage: properties.ownershipPercentage,
          annualExpensesCents: properties.annualExpensesCents,
          occupancyRate: properties.occupancyRate,
        })
        .from(properties)
        .where(propertyFilter(scope, [propertyId ? eq(properties.id, propertyId) : undefined]))
        .orderBy(asc(properties.name), asc(properties.id));
      if (rows.length === 0) return [];

      const ids = rows.map((row) => row.id);
      const [manualRentals, contractRows, reservationRows, transactionRows] = await Promise.all([
        loadByProperty(ids, (chunkIds) =>
          db
            .select({ propertyId: propertyManualRentals.propertyId, monthlyRentCents: propertyManualRentals.monthlyRentCents })
            .from(propertyManualRentals)
            .where(inArray(propertyManualRentals.propertyId, chunkIds)),
        ),
        loadByProperty(ids, (chunkIds) =>
          db
            .select({
              propertyId: contracts.propertyId,
              status: contracts.status,
              startDate: contracts.startDate,
              endDate: contracts.endDate,
              updatedAt: contracts.updatedAt,
              monthlyRentCents: contractRentTerms.monthlyRentCents,
            })
            .from(contracts)
            // A contract without rent terms has nothing to count: the inner join leaves it out.
            .innerJoin(contractRentTerms, eq(contractRentTerms.contractId, contracts.id))
            .where(
              and(
                inArray(contracts.propertyId, chunkIds),
                eq(contracts.contractType, "conventional"),
                ne(contracts.status, "cancelled"),
                lte(contracts.startDate, to),
                or(isNull(contracts.endDate), gte(contracts.endDate, from)),
              ),
            ),
        ),
        loadByProperty(ids, (chunkIds) =>
          db
            .select({
              propertyId: reservations.propertyId,
              checkIn: reservations.checkIn,
              totalAmountCents: reservations.totalAmountCents,
            })
            .from(reservations)
            .where(
              and(
                inArray(reservations.propertyId, chunkIds),
                eq(reservations.status, "confirmed"),
                gte(reservations.checkIn, from),
                lte(reservations.checkIn, to),
              ),
            ),
        ),
        loadByProperty(ids, (chunkIds) =>
          db
            .select(transactionColumns)
            .from(transactions)
            .innerJoin(transactionCategories, eq(transactionCategories.id, transactions.categoryId))
            .where(and(inArray(transactions.propertyId, chunkIds), transactionPeriodFilter(from, to))),
        ),
      ]);

      return rows.map(
        (row): CashFlowPropertyRecord => ({
          ...row,
          manualMonthlyRentCents: manualRentals.get(row.id)?.[0]?.monthlyRentCents ?? null,
          contracts: (contractRows.get(row.id) ?? []).map(({ propertyId: _propertyId, ...contract }) => contract),
          reservations: (reservationRows.get(row.id) ?? []).map(({ propertyId: _propertyId, ...reservation }) => reservation),
          transactions: (transactionRows.get(row.id) ?? []).map(toTransaction),
        }),
      );
    },
  };
}
