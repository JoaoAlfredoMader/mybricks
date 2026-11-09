import { describe, expect, it } from "vitest";
import { loadEnv } from "../../src/config/env.js";

const base = { DATABASE_URL: "postgresql://x", BETTER_AUTH_SECRET: "x".repeat(32) };

describe("LISTINGS_WHATSAPP_NUMBER", () => {
  it("defaults to the platform's number, in wa.me format", () => {
    expect(loadEnv(base).LISTINGS_WHATSAPP_NUMBER).toBe("5548991802046");
  });

  it("accepts 12 or 13 digits", () => {
    expect(loadEnv({ ...base, LISTINGS_WHATSAPP_NUMBER: "554899180204" }).LISTINGS_WHATSAPP_NUMBER).toBe("554899180204");
    expect(loadEnv({ ...base, LISTINGS_WHATSAPP_NUMBER: "5511987654321" }).LISTINGS_WHATSAPP_NUMBER).toBe("5511987654321");
  });

  it("refuses anything else: formatting, the wrong length, text", () => {
    for (const value of ["+55 48 99180-2046", "48991802046", "55489918020461", "55489918020x", ""]) {
      expect(() => loadEnv({ ...base, LISTINGS_WHATSAPP_NUMBER: value }), value).toThrow(/LISTINGS_WHATSAPP_NUMBER/);
    }
  });
});

describe("e-mail settings", () => {
  it("prints e-mail in the console and does not require confirmation by default", () => {
    const env = loadEnv(base);
    expect(env.EMAIL_DRIVER).toBe("log");
    expect(env.REQUIRE_EMAIL_VERIFICATION).toBe(false);
    expect(env.EMAIL_FROM).toBe("MyBricks <nao-responder@mybricks.com.br>");
  });

  it("requires confirmation as soon as e-mail really goes out, unless told otherwise", () => {
    const resend = { ...base, EMAIL_DRIVER: "resend", RESEND_API_KEY: "re_x" };
    expect(loadEnv(resend).REQUIRE_EMAIL_VERIFICATION).toBe(true);
    expect(loadEnv({ ...resend, REQUIRE_EMAIL_VERIFICATION: "false" }).REQUIRE_EMAIL_VERIFICATION).toBe(false);
    expect(loadEnv({ ...base, REQUIRE_EMAIL_VERIFICATION: "true" }).REQUIRE_EMAIL_VERIFICATION).toBe(true);
  });

  it("needs the Resend key to use Resend", () => {
    expect(() => loadEnv({ ...base, EMAIL_DRIVER: "resend" })).toThrow(/RESEND_API_KEY/);
  });

  it("does not run in production with e-mail only printed", () => {
    expect(() => loadEnv({ ...base, NODE_ENV: "production" })).toThrow(/EMAIL_DRIVER=resend/);
    expect(loadEnv({ ...base, NODE_ENV: "production", EMAIL_DRIVER: "resend", RESEND_API_KEY: "re_x" }).EMAIL_DRIVER).toBe("resend");
  });
});
