import { drizzle } from "drizzle-orm/d1";
import type { Database } from "./database.js";
import * as schema from "./schema.js";

/** Wraps a Worker's D1 binding. Typed as `unknown` here: the Worker types would clash with Node's. */
export function createD1Database(binding: unknown): Database {
  return drizzle(binding as Parameters<typeof drizzle>[0], { schema }) as unknown as Database;
}
