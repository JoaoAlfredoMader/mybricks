import { eq } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import { users } from "../../db/schema.js";
import type { Auth } from "./auth.js";

export interface PlatformAdminInput {
  email: string;
  name: string;
  /** Only used when the account does not exist yet. */
  password: string | undefined;
}

export interface PlatformAdminResult {
  /** The account did not exist and was created. */
  created: boolean;
  /** The account existed without the role and was promoted. */
  promoted: boolean;
}

/**
 * Makes sure the platform operator account exists and has the `admin` role. Idempotent: running it
 * again changes nothing, and an existing account keeps its password. The role lives on `users.role`
 * (Better Auth's admin plugin); being the owner of an organization never grants it.
 */
export async function ensurePlatformAdmin(
  { auth, db }: { auth: Auth; db: Database },
  { email, name, password }: PlatformAdminInput,
): Promise<PlatformAdminResult> {
  const normalized = email.trim().toLowerCase();
  const [existing] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, normalized));

  if (existing) {
    const alreadyAdmin = (existing.role ?? "").split(",").some((role) => role.trim() === "admin");
    if (alreadyAdmin) return { created: false, promoted: false };
    await db.update(users).set({ role: "admin" }).where(eq(users.id, existing.id));
    return { created: false, promoted: true };
  }

  if (!password) throw new Error("The account does not exist yet: a password is required to create it");
  // Goes through Better Auth so the password is hashed the way sign-in expects, and the
  // account gets its personal organization like any other user.
  await auth.api.signUpEmail({ body: { name, email: normalized, password } });
  // The operator is created from the console, by someone who controls the server: no link to click.
  await db.update(users).set({ role: "admin", emailVerified: true }).where(eq(users.email, normalized));
  return { created: true, promoted: false };
}
