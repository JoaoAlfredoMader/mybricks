import { rm } from "node:fs/promises";
import type { TestProject } from "vitest/node";
import { createDatabase, migrateDatabase } from "../src/db/client.node.js";

/**
 * Prepares the test database once per run: a new SQLite file with every migration applied (the schema
 * and the reference data: cities, subtypes, categories). The file lives in the temp folder and is
 * removed when the run ends.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const databaseUrl = project.config.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) throw new Error("DATABASE_URL must be a file: URL for the tests");
  const file = databaseUrl.slice("file:".length);

  const { db, close } = createDatabase(databaseUrl);
  try {
    await migrateDatabase(db);
  } finally {
    close();
  }

  // Teardown: the database and the files the tests uploaded.
  const storageDir = project.config.env.STORAGE_DIR;
  return async () => {
    // A worker may still hold the file for a moment on Windows; it is a temp file, so a leftover is harmless.
    await Promise.all(
      [file, `${file}-journal`, `${file}-wal`, `${file}-shm`].map((path) =>
        rm(path, { force: true, maxRetries: 5, retryDelay: 200 }).catch(() => undefined),
      ),
    );
    if (storageDir) await rm(storageDir, { recursive: true, force: true });
  };
}
