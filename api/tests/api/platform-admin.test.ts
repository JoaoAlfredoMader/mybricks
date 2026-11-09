import { afterAll, beforeAll, describe, it } from "vitest";
import { and, count, eq, type SQL } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { members, users } from "../../src/db/schema.js";
import { ensurePlatformAdmin } from "../../src/modules/auth/platform-admin.js";
import { check } from "../helpers/check.js";
import { Session, auth, close, db, resetDatabase, signUp } from "../helpers/world.js";

const deps = { auth, db };

const userByEmail = async (email: string) => {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) throw new Error(`no user ${email}`);
  return user;
};
const countWhere = async (table: SQLiteTable, where: SQL | undefined) => (await db.select({ value: count() }).from(table).where(where))[0]!.value;

/**
 * One scenario told in order: each test builds on the data of the previous ones,
 * so run the file as a whole rather than a single test.
 */
describe("Platform admin creation", () => {
  beforeAll(async () => {
    await resetDatabase();
  });
  afterAll(() => close());

  it("creates the operator account", async () => {
    const result = await ensurePlatformAdmin(deps, { email: "Operador@Example.com", name: "Operador", password: "senha-do-operador-1" });
    check("created, not promoted", result.created === true && result.promoted === false, result);

    const user = await userByEmail("operador@example.com");
    check("stored with the e-mail in lower case and the admin role", user.role === "admin" && user.name === "Operador");
    check("the account got its personal organization like any user", (await countWhere(members, and(eq(members.userId, user.id), eq(members.role, "owner")))) === 1);

    const session = new Session();
    const signIn = await session.call("POST", "/api/auth/sign-in/email", { email: "operador@example.com", password: "senha-do-operador-1" });
    check("the operator signs in with that password", signIn.status === 200, signIn);
    check("and reaches the operator panel", (await session.call("GET", "/api/admin/feedback")).status === 200 && (await session.call("GET", "/api/admin/audit-logs")).status === 200);
    check("/api/me reports the platform role", (await session.call("GET", "/api/me")).json?.user?.platformRole === "admin");
  });

  it("is idempotent: running it again changes nothing", async () => {
    const before = await userByEmail("operador@example.com");
    const again = await ensurePlatformAdmin(deps, { email: "operador@example.com", name: "Outro Nome", password: "outra-senha-qualquer" });
    check("nothing created, nothing promoted", again.created === false && again.promoted === false, again);

    const after = await userByEmail("operador@example.com");
    check("the account is exactly as it was (name included)", after.id === before.id && after.name === "Operador" && after.role === "admin");
    check("the password was not replaced", (await new Session().call("POST", "/api/auth/sign-in/email", { email: "operador@example.com", password: "senha-do-operador-1" })).status === 200 && (await new Session().call("POST", "/api/auth/sign-in/email", { email: "operador@example.com", password: "outra-senha-qualquer" })).status !== 200);
    check("still one user and one organization for it", (await countWhere(users, eq(users.email, "operador@example.com"))) === 1 && (await countWhere(members, eq(members.userId, before.id))) === 1);
    check("e-mail case does not matter", (await ensurePlatformAdmin(deps, { email: "  OPERADOR@example.com ", name: "x", password: undefined })).created === false);
  });

  it("promotes an existing account without touching its password or data", async () => {
    const ana = await signUp("Ana Souza", "ana@example.com");
    check("(setup) a normal user cannot open the panel", (await ana.session.call("GET", "/api/admin/feedback")).status === 403);
    const property = await ana.session.call("POST", "/api/properties", { name: "Apto da Ana", propertyType: "residential", usageType: "rental" });

    const result = await ensurePlatformAdmin(deps, { email: "ana@example.com", name: "ignorado", password: undefined });
    check("promoted, not created, and no password needed", result.promoted === true && result.created === false, result);
    check("her role changed and nothing else did", (await userByEmail("ana@example.com")).role === "admin" && (await userByEmail("ana@example.com")).name === "Ana Souza");

    const session = new Session();
    check("she signs in with her own password", (await session.call("POST", "/api/auth/sign-in/email", { email: "ana@example.com", password: "senha-forte-123" })).status === 200);
    check("and now opens the panel", (await session.call("GET", "/api/admin/feedback")).status === 200);
    check("her data is intact", (await session.call("GET", `/api/properties/${property.json.id}`)).status === 200);
  });

  it("refuses to create an account without a password, or with a weak one", async () => {
    await ensurePlatformAdmin(deps, { email: "novo@example.com", name: "Novo", password: undefined }).then(
      () => check("no password -> error", false),
      (error: Error) => check("no password -> error that says so", /password is required/.test(error.message), error.message),
    );
    check("and nothing was created", (await countWhere(users, eq(users.email, "novo@example.com"))) === 0);

    await ensurePlatformAdmin(deps, { email: "fraco@example.com", name: "Fraco", password: "123" }).then(
      () => check("weak password -> error", false),
      () => check("a password that is too short is refused by the sign-up rules", true),
    );
    check("no half-created account is left behind", (await countWhere(users, eq(users.email, "fraco@example.com"))) === 0);
  });

  it("being an organization owner is still not enough", async () => {
    const bia = await signUp("Bia Lima", "bia@example.com");
    check("an owner of her own organization -> 403 on the panel", (await bia.session.call("GET", "/api/admin/feedback")).status === 403);
  });
});
