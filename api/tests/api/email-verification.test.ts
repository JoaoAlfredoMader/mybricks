import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadEnv } from "../../src/config/env.js";
import { createContainer } from "../../src/container.js";
import { createMemoryMailer } from "../../src/lib/mail/memory-mailer.js";
import { check } from "../helpers/check.js";
import { Session, prisma, resetDatabase } from "../helpers/world.js";

/**
 * The app wired the way production runs it: sign-in waits for the e-mail link, and the e-mail
 * (here, a memory mailer) is the only place the link exists. One scenario told in order.
 */
describe("E-mail confirmation", () => {
  const mailer = createMemoryMailer();
  const env = loadEnv({ ...process.env, REQUIRE_EMAIL_VERIFICATION: "true" });
  const verifying = createContainer(env, { withoutDemoData: true, mailer });
  const callbackURL = `${env.FRONTEND_URL}/login`;

  /** The link in the nth e-mail, as a path the in-process app can be called with. */
  async function linkFromEmail(count: number): Promise<string> {
    await expect.poll(() => mailer.outbox.length).toBeGreaterThanOrEqual(count);
    const url = mailer.outbox[count - 1]!.text.match(/https?:\/\/\S+/)?.[0];
    if (!url) throw new Error("no link in the e-mail");
    const { pathname, search } = new URL(url);
    return `${pathname}${search}`;
  }

  beforeAll(resetDatabase);
  afterAll(async () => {
    await verifying.prisma.$disconnect();
    await prisma.$disconnect();
  });

  it("sign-up sends the e-mail and does not open a session", async () => {
    const ana = new Session(verifying.app);
    const signUp = await ana.call("POST", "/api/auth/sign-up/email", {
      name: "Ana Souza",
      email: "ana@example.com",
      password: "senha-forte-123",
      callbackURL,
    });
    check("sign-up -> 200 without a token", signUp.status === 200 && signUp.json?.token === null, signUp);
    check("no session yet", (await ana.call("GET", "/api/me")).status === 401);
    await linkFromEmail(1);
    check(
      "the e-mail goes to the new address, in Portuguese",
      mailer.outbox[0]?.to === "ana@example.com" && mailer.outbox[0].subject === "Confirme seu e-mail no MyBricks",
      mailer.outbox[0],
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ana@example.com" } });
    check("the account exists, not confirmed", user.emailVerified === false);
  });

  it("signing in before confirming is refused and sends a fresh link", async () => {
    const ana = new Session(verifying.app);
    const signIn = await ana.call("POST", "/api/auth/sign-in/email", { email: "ana@example.com", password: "senha-forte-123", callbackURL });
    check("sign-in -> 403 EMAIL_NOT_VERIFIED", signIn.status === 403 && signIn.json?.code === "EMAIL_NOT_VERIFIED", signIn);
    await linkFromEmail(2);
  });

  it("the link confirms the address, signs in and redirects to the app", async () => {
    const ana = new Session(verifying.app);
    const verify = await ana.call("GET", await linkFromEmail(2));
    check("verify-email redirects", verify.status === 302, verify);
    const me = await ana.call("GET", "/api/me");
    check("signed in as Ana", me.status === 200 && me.json?.user?.email === "ana@example.com", me);
    check("in her personal organization, as owner", Boolean(me.json?.organizationId) && me.json?.memberRole === "owner", me.json);
    check("the address is now confirmed", (await prisma.user.findUniqueOrThrow({ where: { email: "ana@example.com" } })).emailVerified === true);
    const normal = new Session(verifying.app);
    check("and e-mail sign-in works from then on", (await normal.call("POST", "/api/auth/sign-in/email", { email: "ana@example.com", password: "senha-forte-123" })).status === 200);
  });

  it("a broken link does not confirm anything and sends the visitor back with the reason", async () => {
    const stranger = new Session(verifying.app);
    const res = await stranger.call("GET", `/api/auth/verify-email?token=not-a-token&callbackURL=${encodeURIComponent(callbackURL)}`);
    check("redirects instead of leaving a JSON error", res.status === 302, res);
    check("no session", (await stranger.call("GET", "/api/me")).status === 401);
  });

  it("a guest who signs up keeps the demo workspace once the link is followed in the same browser", async () => {
    const guest = new Session(verifying.app);
    check("guest sign-in -> 200", (await guest.call("POST", "/api/auth/sign-in/anonymous")).status === 200);
    const before = await guest.call("GET", "/api/me");
    const guestOrganization = before.json?.organizationId as string;
    check("the guest works in a demo organization", (await prisma.organization.findUniqueOrThrow({ where: { id: guestOrganization } })).isDemo === true);

    const sent = mailer.outbox.length;
    const signUp = await guest.call("POST", "/api/auth/sign-up/email", { name: "Bia Lima", email: "bia@example.com", password: "senha-forte-123", callbackURL });
    check("sign-up -> 200", signUp.status === 200, signUp);
    await guest.call("GET", await linkFromEmail(sent + 1));

    const after = await guest.call("GET", "/api/me");
    check("now Bia, no longer a guest", after.json?.user?.email === "bia@example.com" && after.json?.user?.isAnonymous === false, after.json?.user);
    check(
      "the demo organization is hers and no longer expires",
      after.json?.organizationId === guestOrganization && (await prisma.organization.findUniqueOrThrow({ where: { id: guestOrganization } })).isDemo === false,
      after.json,
    );
  });
});
