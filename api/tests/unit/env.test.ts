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
