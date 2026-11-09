import "dotenv/config";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

/** Uploaded files of the tests; removed by the global setup when the run ends. */
export const TEST_STORAGE_DIR = join(tmpdir(), "mybricks-test-storage");

/**
 * Tests run against their own SQLite file, never against the development one: the scenarios wipe the
 * auth tables. One file per run (the process id keeps two simultaneous runs apart); the global setup
 * creates it and the teardown removes it.
 */
export const TEST_DATABASE_FILE = join(tmpdir(), `mybricks-test-${process.pid}.db`);

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: `file:${TEST_DATABASE_FILE}`,
      // Deterministic whatever the developer's .env says: e-mail is only printed, nobody has to confirm it.
      EMAIL_DRIVER: "log",
      REQUIRE_EMAIL_VERIFICATION: "false",
      STORAGE_DRIVER: "local",
      STORAGE_DIR: TEST_STORAGE_DIR,
      // Small on purpose, so the "too large" scenarios do not need big buffers.
      MAX_UPLOAD_MB: "1",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "test-only-secret-test-only-secret-0123456789",
    },
    // The scenario files share one database, so they run one after the other.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
