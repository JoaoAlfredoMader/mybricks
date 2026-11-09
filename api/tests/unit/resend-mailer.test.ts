import { describe, expect, it, vi } from "vitest";
import { createResendMailer } from "../../src/lib/mail/resend-mailer.js";

const message = { to: "ana@example.com", subject: "Olá", html: "<p>oi</p>", text: "oi" };

describe("Resend mailer", () => {
  it("posts the message to Resend's API with the key and the sender", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: "1" }), { status: 200 }));
    const mailer = createResendMailer({ apiKey: "re_test", from: "MyBricks <nao-responder@mybricks.com.br>", fetch: fetcher });

    await mailer.send(message);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "MyBricks <nao-responder@mybricks.com.br>",
      to: ["ana@example.com"],
      subject: "Olá",
      html: "<p>oi</p>",
      text: "oi",
    });
  });

  it("adds reply_to only when one is set", async () => {
    const fetcher = vi.fn(async () => new Response("{}", { status: 200 }));
    await createResendMailer({ apiKey: "k", from: "a@b.c", replyTo: "contato@mybricks.com.br", fetch: fetcher }).send(message);
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).reply_to).toBe("contato@mybricks.com.br");
  });

  it("fails loudly, with Resend's explanation, when the e-mail is refused", async () => {
    const fetcher = vi.fn(async () => new Response('{"message":"The mybricks.com.br domain is not verified"}', { status: 403 }));
    const mailer = createResendMailer({ apiKey: "k", from: "a@b.c", fetch: fetcher });
    await expect(mailer.send(message)).rejects.toThrow(/403.*not verified/);
  });
});
