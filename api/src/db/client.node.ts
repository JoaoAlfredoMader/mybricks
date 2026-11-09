import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "node:path";
import type { Database } from "./database.js";
import * as schema from "./schema.js";

/** Where the migrations live (the same files `wrangler d1 migrations apply` runs on D1). */
export const MIGRATIONS_DIR = resolve(import.meta.dirname, "../../migrations");

/** Opens a local SQLite file, or `file::memory:`. Foreign keys are enforced by default, as on D1. */
export function createDatabase(url: string): { db: Database; close: () => void } {
  const client = createClient({ url });
  return { db: drizzle(client, { schema }), close: () => client.close() };
}

/** Applies the pending migrations. Used by tests and the local scripts; D1 uses wrangler for the same files. */
export function migrateDatabase(db: Database): Promise<void> {
  return migrate(db, { migrationsFolder: MIGRATIONS_DIR });
}
