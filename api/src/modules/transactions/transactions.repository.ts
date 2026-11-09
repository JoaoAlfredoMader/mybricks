import { type SQL, and, asc, count, desc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import type { TransactionType } from "../../db/enums.js";
import { properties, transactionCategories, transactions } from "../../db/schema.js";
import { transactionPeriodFilter } from "./transaction-period.js";

export interface TransactionRecord {
  id: string;
  propertyId: string;
  categoryId: number;
  amountCents: bigint;
  occurredOn: Date;
  description: string | null;
  isRecurring: boolean;
  recurrenceEndsOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
  property: { name: string };
  category: { name: string; transactionType: TransactionType };
}

/** Every query is bound to one organization; members only reach transactions of properties they created. */
export interface TransactionScope {
  organizationId: string;
  propertyCreatedById?: string;
}

export interface NewTransactionData {
  propertyId: string;
  categoryId: number;
  amountCents: bigint;
  occurredOn: Date;
  description: string | null;
  isRecurring: boolean;
  recurrenceEndsOn: Date | null;
}

export type TransactionPatch = Partial<Omit<NewTransactionData, "propertyId">>;

export interface TransactionListQuery {
  propertyId?: string;
  categoryId?: number;
  transactionType?: TransactionType;
  isRecurring?: boolean;
  /**
   * Inclusive period. A one-off transaction is kept when `occurredOn` is inside it; a recurring one
   * when its run of monthly occurrences touches it (see `transactionPeriodFilter`).
   */
  from?: Date;
  to?: Date;
  skip: number;
  take: number;
}

export interface TransactionsRepository {
  list(scope: TransactionScope, query: TransactionListQuery): Promise<{ items: TransactionRecord[]; total: number }>;
  findById(scope: TransactionScope, id: string): Promise<TransactionRecord | null>;
  create(scope: TransactionScope, data: NewTransactionData): Promise<TransactionRecord>;
  update(scope: TransactionScope, id: string, patch: TransactionPatch): Promise<TransactionRecord | null>;
  delete(scope: TransactionScope, id: string): Promise<boolean>;

  propertyVisible(scope: TransactionScope, propertyId: string): Promise<boolean>;
  categoryExists(categoryId: number): Promise<boolean>;
}

const columns = {
  id: transactions.id,
  propertyId: transactions.propertyId,
  categoryId: transactions.categoryId,
  amountCents: transactions.amountCents,
  occurredOn: transactions.occurredOn,
  description: transactions.description,
  isRecurring: transactions.isRecurring,
  recurrenceEndsOn: transactions.recurrenceEndsOn,
  createdAt: transactions.createdAt,
  updatedAt: transactions.updatedAt,
  propertyName: properties.name,
  categoryName: transactionCategories.name,
  transactionType: transactionCategories.transactionType,
};

function toRecord({
  propertyName,
  categoryName,
  transactionType,
  ...own
}: {
  id: string;
  propertyId: string;
  categoryId: number;
  amountCents: bigint;
  occurredOn: Date;
  description: string | null;
  isRecurring: boolean;
  recurrenceEndsOn: Date | null;
  createdAt: Date;
  updatedAt: Date;
  propertyName: string;
  categoryName: string;
  transactionType: TransactionType;
}): TransactionRecord {
  return { ...own, property: { name: propertyName }, category: { name: categoryName, transactionType } };
}

/** Repository layer: the only place that talks to the database. */
export function createTransactionsRepository(db: Database): TransactionsRepository {
  /** Condition on the `transactions` table alone, so it also serves updates and deletes. */
  function whereFor(scope: TransactionScope): SQL {
    return and(
      eq(transactions.organizationId, scope.organizationId),
      scope.propertyCreatedById
        ? inArray(
            transactions.propertyId,
            db
              .select({ id: properties.id })
              .from(properties)
              .where(and(eq(properties.organizationId, scope.organizationId), eq(properties.createdById, scope.propertyCreatedById))),
          )
        : undefined,
    )!;
  }

  const selectTransactions = () =>
    db
      .select(columns)
      .from(transactions)
      .innerJoin(properties, and(eq(properties.id, transactions.propertyId), eq(properties.organizationId, transactions.organizationId)))
      .innerJoin(transactionCategories, eq(transactionCategories.id, transactions.categoryId));

  async function findRecord(scope: TransactionScope, id: string): Promise<TransactionRecord | null> {
    const [row] = await selectTransactions().where(and(whereFor(scope), eq(transactions.id, id))).limit(1);
    return row ? toRecord(row) : null;
  }

  return {
    async list(scope, { propertyId, categoryId, transactionType, isRecurring, from, to, skip, take }) {
      const where = and(
        whereFor(scope),
        propertyId ? eq(transactions.propertyId, propertyId) : undefined,
        categoryId ? eq(transactions.categoryId, categoryId) : undefined,
        transactionType ? eq(transactionCategories.transactionType, transactionType) : undefined,
        isRecurring !== undefined ? eq(transactions.isRecurring, isRecurring) : undefined,
        from || to ? transactionPeriodFilter(from, to) : undefined,
      );
      const [items, [totalRow]] = await Promise.all([
        selectTransactions().where(where).orderBy(desc(transactions.occurredOn), asc(transactions.id)).limit(take).offset(skip),
        db
          .select({ value: count() })
          .from(transactions)
          .innerJoin(transactionCategories, eq(transactionCategories.id, transactions.categoryId))
          .where(where),
      ]);
      return { items: items.map(toRecord), total: totalRow?.value ?? 0 };
    },

    findById: findRecord,

    async create(scope, data) {
      const id = crypto.randomUUID();
      await db.insert(transactions).values({ id, ...data, organizationId: scope.organizationId });
      return (await findRecord({ organizationId: scope.organizationId }, id))!;
    },

    async update(scope, id, patch) {
      const updated = await db
        .update(transactions)
        .set(Object.keys(patch).length > 0 ? patch : { updatedAt: new Date() })
        .where(and(whereFor(scope), eq(transactions.id, id)))
        .returning({ id: transactions.id });
      if (updated.length === 0) return null;
      return findRecord(scope, id);
    },

    async delete(scope, id) {
      const removed = await db
        .delete(transactions)
        .where(and(whereFor(scope), eq(transactions.id, id)))
        .returning({ id: transactions.id });
      return removed.length > 0;
    },

    async propertyVisible(scope, propertyId) {
      const [row] = await db
        .select({ value: count() })
        .from(properties)
        .where(
          and(
            eq(properties.id, propertyId),
            eq(properties.organizationId, scope.organizationId),
            scope.propertyCreatedById ? eq(properties.createdById, scope.propertyCreatedById) : undefined,
          ),
        );
      return (row?.value ?? 0) > 0;
    },

    async categoryExists(categoryId) {
      const [row] = await db.select({ value: count() }).from(transactionCategories).where(eq(transactionCategories.id, categoryId));
      return (row?.value ?? 0) > 0;
    },
  };
}
