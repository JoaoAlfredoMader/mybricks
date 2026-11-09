import { loadEnv } from "../config/env.js";
import { createDatabase, migrateDatabase } from "../db/client.node.js";

/** Applies the pending migrations to the local SQLite file (`DATABASE_URL`): `npm run db:migrate`. On D1 use `wrangler d1 migrations apply`. */
const { db, close } = createDatabase(loadEnv().DATABASE_URL);
try {
  await migrateDatabase(db);
  console.log("Migrations applied");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  close();
}
