import type { Env } from "../../config/env.js";
import { createLogMailer } from "./log-mailer.js";
import type { Mailer } from "./mailer.js";
import { createResendMailer } from "./resend-mailer.js";

export type { MailMessage, Mailer } from "./mailer.js";

/** Picks the driver from the environment. The env schema already guarantees the Resend key is there. */
export function createMailer(env: Env): Mailer {
  if (env.EMAIL_DRIVER === "resend") {
    return createResendMailer({ apiKey: env.RESEND_API_KEY!, from: env.EMAIL_FROM, replyTo: env.EMAIL_REPLY_TO });
  }
  return createLogMailer();
}
