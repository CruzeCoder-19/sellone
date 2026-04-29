import nodemailer from "nodemailer";

// NOTE: Never import this file from middleware.ts or auth.config.ts — Nodemailer is Node-only.

const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export const mailer = hasSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!mailer) {
    console.log("[DEV EMAIL]", { to, subject, html: html.slice(0, 200) });
    return;
  }
  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}
