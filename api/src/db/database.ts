import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type * as schema from "./schema.js";

/**
 * The database the repositories talk to. Two drivers sit behind it: libSQL on Node (the dev server, the
 * scripts and the tests, over a local SQLite file) and Cloudflare D1 on a Worker (`client.d1.ts`).
 * Both are SQLite and Drizzle gives them the same query builder, including `batch`: the statements of a
 * batch run in ONE transaction, all or nothing. That is the only atomic unit D1 offers, so multi-step
 * writes are written as a batch (see `atomic.ts`), never as an interactive transaction.
 */
export type Database = LibSQLDatabase<typeof schema>;

export type { schema };
