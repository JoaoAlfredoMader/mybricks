import { afterAll, beforeAll, describe, it } from "vitest";
import { count, eq, lt } from "drizzle-orm";
import { loadEnv } from "../../src/config/env.js";
import { createContainer } from "../../src/container.js";
import { organizations, rateLimits } from "../../src/db/schema.js";
import { runMaintenance } from "../../src/modules/maintenance/maintenance.js";
import { check } from "../helpers/check.js";
import { Session, close, db, resetDatabase, storage } from "../helpers/world.js";

/**
 * The app wired the way production runs it: request limits on, a small daily cap for guest workspaces. Requests
 * carry Cloudflare's `cf-connecting-ip` header, as they do at the edge (without an address nothing can be counted).
 */
describe("Protection against floods", () => {
  const env = loadEnv({ ...process.env, RATE_LIMIT: "on", DEMO_DAILY_LIMIT: "3" });
  const guarded = createContainer(env, { withoutDemoData: true });
  const from = (ip: string) => ({ "cf-connecting-ip": ip });

  beforeAll(resetDatabase);
  afterAll(() => {
    guarded.close();
    close();
  });

  it("limits sign-in attempts per address, then lets them through again for another address", async () => {
    const attacker = new Session(guarded.app);
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await attacker.call("POST", "/api/auth/sign-in/email", { email: "ninguem@example.com", password: "senha-errada-1" }, undefined, from("203.0.113.7"));
      statuses.push(response.status);
    }
    check("the first attempts are answered normally (wrong credentials)", statuses.slice(0, 10).every((status) => status === 401), statuses);
    check("then the address is told to slow down (429)", statuses.slice(10).every((status) => status === 429), statuses);

    const other = new Session(guarded.app);
    const response = await other.call("POST", "/api/auth/sign-in/email", { email: "ninguem@example.com", password: "senha-errada-1" }, undefined, from("203.0.113.99"));
    check("another address is not affected", response.status === 401, response.status);
  });

  it("limits account creation per address", async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 7; index++) {
      const response = await new Session(guarded.app).call(
        "POST",
        "/api/auth/sign-up/email",
        { name: `Pessoa ${index}`, email: `pessoa${index}@example.com`, password: "senha-forte-123" },
        undefined,
        from("203.0.113.50"),
      );
      statuses.push(response.status);
    }
    check("five accounts in ten minutes, then 429", statuses.slice(0, 5).every((status) => status === 200) && statuses.slice(5).every((status) => status === 429), statuses);
  });

  it("caps the guest workspaces started per day, whatever the address", async () => {
    const results: number[] = [];
    for (let index = 0; index < 5; index++) {
      const response = await new Session(guarded.app).call("POST", "/api/auth/sign-in/anonymous", undefined, undefined, from(`198.51.100.${index + 1}`));
      results.push(response.status);
    }
    check("three guests start, the others are refused", results.slice(0, 3).every((status) => status === 200) && results.slice(3).every((status) => status === 429), results);

    const refused = await new Session(guarded.app).call("POST", "/api/auth/sign-in/anonymous", undefined, undefined, from("198.51.100.200"));
    check("with a code the front-end can explain", refused.json?.code === "DEMO_LIMIT_REACHED", refused.json);
    const [demos] = await db.select({ value: count() }).from(organizations).where(eq(organizations.isDemo, true));
    check("and only three demo organizations exist", demos?.value === 3, demos);
  });

  it("refuses a huge JSON body before reading it", async () => {
    const session = new Session(guarded.app);
    const response = await session.call("POST", "/api/feedback", { message: "x".repeat(2 * 1024 * 1024) });
    check("413 instead of parsing it", response.status === 413 && response.json?.error?.code === "PAYLOAD_TOO_LARGE", { status: response.status, json: response.json });
  });

  it("sends the usual security headers", async () => {
    const response = await guarded.app.request("/health");
    check("nosniff and no framing", response.headers.get("x-content-type-options") === "nosniff" && response.headers.get("x-frame-options") !== null, Object.fromEntries(response.headers));
    check("HSTS", Boolean(response.headers.get("strict-transport-security")));
  });

  it("the maintenance drops counters no window can use any more", async () => {
    const dayAndMore = Date.now() - 25 * 60 * 60 * 1000;
    await db.insert(rateLimits).values({ key: "198.51.100.77/sign-in/email", count: 3, lastRequest: dayAndMore });
    const before = (await db.select({ value: count() }).from(rateLimits))[0]?.value ?? 0;
    const report = await runMaintenance({ db, storage });
    const stale = (await db.select({ value: count() }).from(rateLimits).where(lt(rateLimits.lastRequest, Date.now() - 24 * 60 * 60 * 1000)))[0]?.value;
    check("the stale one is purged and the recent ones stay", report.rateLimitCountersPurged === 1 && stale === 0 && before > 1, { report, stale, before });
  });
});
