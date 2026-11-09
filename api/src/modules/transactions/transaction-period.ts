import { type SQL, and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { transactions } from "../../db/schema.js";

const firstOfMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

/**
 * Period filter that knows about recurrence. A recurring transaction is one record that stands for
 * a charge every month from `occurredOn` until `recurrenceEndsOn`, so it belongs to the period when
 * it started on or before `to` and has not ended before `from`. The end is compared by month,
 * inclusive (an end date anywhere in the month of `from` still reaches it), the same way the IRR
 * cash flow and the monthly cash flow read it. A one-off transaction keeps the plain date rule.
 *
 * Both bounds are inclusive and optional; give at least one. The condition is on the `transactions` table.
 */
export function transactionPeriodFilter(from: Date | undefined, to: Date | undefined): SQL {
  const oneOff = and(
    eq(transactions.isRecurring, false),
    from ? gte(transactions.occurredOn, from) : undefined,
    to ? lte(transactions.occurredOn, to) : undefined,
  );
  const recurring = and(
    eq(transactions.isRecurring, true),
    to ? lte(transactions.occurredOn, to) : undefined,
    from ? or(isNull(transactions.recurrenceEndsOn), gte(transactions.recurrenceEndsOn, firstOfMonth(from))) : undefined,
  );
  return or(oneOff, recurring)!;
}
