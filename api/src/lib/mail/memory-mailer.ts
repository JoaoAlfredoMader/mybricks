import type { MailMessage, Mailer } from "./mailer.js";

/** Keeps what it was asked to send, so a test can read the e-mail and follow its link. */
export function createMemoryMailer(): Mailer & { outbox: MailMessage[] } {
  const outbox: MailMessage[] = [];
  return {
    outbox,
    async send(message) {
      outbox.push(message);
    },
  };
}
