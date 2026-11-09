import { customType, integer } from "drizzle-orm/sqlite-core";

/**
 * Column types that keep the application's types (bigint cents, Date) on top of what SQLite stores.
 * The rest of the code never sees SQLite's integers and strings.
 */

/** Money, in cents. SQLite keeps an integer; the app works with bigint, as before. */
export const cents = customType<{ data: bigint; driverData: number }>({
  dataType: () => "integer",
  fromDriver: (value) => BigInt(value),
  toDriver: (value) => Number(value),
});

/** A calendar day (no time, no zone): stored as `YYYY-MM-DD`, read as that day at 00:00 UTC. */
export const dateOnly = customType<{ data: Date; driverData: string }>({
  dataType: () => "text",
  fromDriver: (value) => new Date(`${value}T00:00:00.000Z`),
  toDriver: (value) => value.toISOString().slice(0, 10),
});

/** A moment in time, in milliseconds since the epoch. */
export const instant = (name: string) => integer(name, { mode: "timestamp_ms" });

export const flag = (name: string) => integer(name, { mode: "boolean" });
