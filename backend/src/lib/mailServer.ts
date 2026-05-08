import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "../config.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
});

if (!env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(env.RESEND_API_KEY);

async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new Error("Resend is misconfigured");
    }

    await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
    });
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to,
    subject: "Verify your email",
    text: `Please verify your email by clicking this link: ${verificationUrl}`,
  });
}

export async function sendSecurityAlertEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  await sendEmail({
    to,
    subject,
    text,
  });
}

export async function sendTokenEmail({
  to,
  subject,
  path,
  token,
  text,
}: {
  to: string;
  subject: string;
  path: string;
  token: string;
  text: string;
}) {
  const url = `${env.FRONTEND_URL}${path}?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to,
    subject,
    text: `${text}: ${url}`,
  });
}
