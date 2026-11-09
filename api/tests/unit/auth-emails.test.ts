import { describe, expect, it } from "vitest";
import { verificationEmail } from "../../src/modules/auth/auth-emails.js";

const url = "https://mybricks.com.br/api/auth/verify-email?token=abc&callbackURL=https%3A%2F%2Fmybricks.com.br%2Flogin";

describe("verification e-mail", () => {
  it("greets the first name and carries the link in both bodies", () => {
    const mail = verificationEmail({ to: "ana@example.com", name: "Ana Souza", url, expiresInHours: 24 });
    expect(mail.to).toBe("ana@example.com");
    expect(mail.subject).toBe("Confirme seu e-mail no MyBricks");
    expect(mail.text).toContain("Olá, Ana!");
    expect(mail.text).toContain(url);
    expect(mail.text).toContain("24 horas");
    expect(mail.html).toContain('href="https://mybricks.com.br/api/auth/verify-email?token=abc&amp;callbackURL=');
  });

  it("does not let the name inject markup", () => {
    const mail = verificationEmail({ to: "x@example.com", name: '<img src=x onerror="alert(1)">', url, expiresInHours: 1 });
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;img");
    expect(mail.text).toContain("1 hora.");
  });

  it("still greets someone with no name", () => {
    expect(verificationEmail({ to: "x@example.com", name: "  ", url, expiresInHours: 24 }).text).toMatch(/^Olá!/);
  });
});
