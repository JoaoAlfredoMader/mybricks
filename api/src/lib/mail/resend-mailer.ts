import type { MailMessage, Mailer } from "./mailer.js";

export interface ResendOptions {
  apiKey: string;
  /** `Name <address@your-verified-domain>`; the domain has to be verified in Resend. */
  from: string;
  replyTo?: string | undefined;
  /** Injectable for the tests. */
  fetch?: typeof fetch;
}

const RESEND_URL = "https://api.resend.com/emails";

/**
 * Sends through Resend's HTTP API. Plain `fetch` on purpose: no SDK, nothing that needs Node, so the
 * same code runs on a server and on a Cloudflare Worker.
 */
export function createResendMailer({ apiKey, from, replyTo, fetch: fetcher = fetch }: ResendOptions): Mailer {
  return {
    async send({ to, subject, html, text }: MailMessage) {
      const response = await fetcher(RESEND_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
      });
      if (!response.ok) {
        // Resend explains the refusal in the body ("domain is not verified", "invalid API key"...).
        const detail = await response.text().catch(() => "");
        throw new Error(`Resend refused the e-mail (${response.status}): ${detail.slice(0, 300)}`);
      }
    },
  };
}
