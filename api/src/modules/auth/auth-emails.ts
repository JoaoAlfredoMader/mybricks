import type { MailMessage } from "../../lib/mail/mailer.js";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Only the first name: "Ana Souza" is greeted as "Ana". */
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "";

/**
 * The confirmation e-mail, in Portuguese like every text the visitor reads. Inline styles and a
 * table-free layout: mail apps ignore almost everything else.
 */
export function verificationEmail({
  to,
  name,
  url,
  expiresInHours,
}: {
  to: string;
  name: string;
  url: string;
  expiresInHours: number;
}): MailMessage {
  const greeting = firstName(name) ? `Olá, ${firstName(name)}!` : "Olá!";
  const safeUrl = escapeHtml(url);
  const validity = expiresInHours === 1 ? "1 hora" : `${expiresInHours} horas`;

  const text = [
    greeting,
    "",
    "Para ativar sua conta no MyBricks, confirme seu e-mail neste link:",
    url,
    "",
    `O link vale por ${validity}. Se não foi você quem criou a conta, ignore esta mensagem.`,
    "",
    "MyBricks",
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <p style="margin:0 0 24px;font-size:20px;font-weight:700;letter-spacing:-0.01em;">MyBricks</p>
      <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${escapeHtml(greeting)}</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Para ativar sua conta no MyBricks, confirme seu e-mail.</p>
      <p style="margin:0 0 24px;">
        <a href="${safeUrl}" style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">Confirmar e-mail</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#52525b;">Se o botão não abrir, copie este endereço no navegador:</p>
      <p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;color:#52525b;">${safeUrl}</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">O link vale por ${validity}. Se não foi você quem criou a conta, ignore esta mensagem.</p>
    </div>
  </body>
</html>`;

  return { to, subject: "Confirme seu e-mail no MyBricks", html, text };
}
