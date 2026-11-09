import { type SQL, and, count, eq, isNull } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "./world.js";

/**
 * A few one-line database reads and writes for the tests, so a check reads as "how many sessions does this
 * user have" instead of a query builder chain. Filters are plain objects: `{ userId, role: "owner" }` means
 * every key equals its value (`null` means IS NULL).
 */
type Filter = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = SQLiteTable & Record<string, any>;

function where(table: AnyTable, filter: Filter = {}): SQL | undefined {
  const conditions = Object.entries(filter).map(([key, value]) => {
    const column = table[key];
    if (!column) throw new Error(`unknown column ${key}`);
    return value === null ? isNull(column) : eq(column, value);
  });
  return conditions.length ? and(...conditions) : undefined;
}

export async function countWhere(table: AnyTable, filter: Filter = {}): Promise<number> {
  const [row] = await db.select({ value: count() }).from(table).where(where(table, filter));
  return row?.value ?? 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function rowsWhere(table: AnyTable, filter: Filter = {}): Promise<any[]> {
  return db.select().from(table).where(where(table, filter));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function firstWhere(table: AnyTable, filter: Filter = {}): Promise<any> {
  const [row] = await db.select().from(table).where(where(table, filter)).limit(1);
  if (!row) throw new Error(`no row found with ${JSON.stringify(filter)}`);
  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertRow(table: AnyTable, values: Filter): Promise<any> {
  const [row] = await db.insert(table).values(values as never).returning();
  return row;
}

export async function updateWhere(table: AnyTable, filter: Filter, set: Filter): Promise<void> {
  await db.update(table).set(set as never).where(where(table, filter));
}

export async function deleteWhere(table: AnyTable, filter: Filter): Promise<void> {
  await db.delete(table).where(where(table, filter));
}
