import { sql } from "drizzle-orm";
import type { Database } from "../../db/database.js";

export interface HealthRepository {
  pingDatabase(): Promise<boolean>;
}

/** Repository layer: the only place that talks to the database. */
export function createHealthRepository(db: Database): HealthRepository {
  return {
    async pingDatabase() {
      try {
        await db.run(sql`SELECT 1`);
        return true;
      } catch {
        return false;
      }
    },
  };
}
