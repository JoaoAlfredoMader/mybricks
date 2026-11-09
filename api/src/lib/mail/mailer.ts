/** A transactional e-mail. Every message has both bodies: HTML for the mail apps, text as the fallback. */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Whatever delivers e-mail. The app only knows this; the driver is picked from the environment. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
