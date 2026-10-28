import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { unprocessable } from "../utils/http-error.js";

let transporter = null;

function assertMailConfig() {
  if (!env.mail.host || !env.mail.user || !env.mail.pass || !env.mail.from) {
    throw unprocessable("Email service is not configured");
  }
}

function getTransporter() {
  assertMailConfig();

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: {
        user: env.mail.user,
        pass: env.mail.pass
      }
    });
  }

  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const mailer = getTransporter();
  return mailer.sendMail({
    from: env.mail.from,
    to,
    subject,
    text,
    html
  });
}
