import type { Mailer } from "./mailer.js";

/** Development driver: nothing leaves the machine, the message (and its links) is printed instead. */
export function createLogMailer(write: (line: string) => void = console.info): Mailer {
  return {
    async send({ to, subject, text }) {
      write(`[mail] to: ${to}\n[mail] subject: ${subject}\n${text}`);
    },
  };
}
