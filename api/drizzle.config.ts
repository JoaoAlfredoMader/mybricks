import { defineConfig } from "drizzle-kit";

// Cloudflare D1 is SQLite: `drizzle-kit generate` writes plain .sql files, and `wrangler d1 migrations apply`
// runs them. Nothing here connects to a database.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
