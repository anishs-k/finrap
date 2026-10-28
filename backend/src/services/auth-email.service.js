import { env } from "../config/env.js";
import { ROLE_LABELS } from "../constants/roles.js";
import { sendMail } from "./mail.service.js";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loginUrl() {
  return "https://service.thefinrep.com";
}

const DEFAULT_PUBLIC_API_BASE_URL = "https://api.thefinrep.com";

function credentialHtml({ heading, intro, email, password, apiToken, apiBaseUrl = DEFAULT_PUBLIC_API_BASE_URL }) {
  const apiTokenBlock = apiToken
    ? `
      <div style="border:1px solid #dbe2ec;padding:16px;margin:0 0 18px;background:#f8fffb">
        <p style="margin:0 0 8px"><strong>Public API token</strong></p>
        <p style="margin:0 0 8px">API Base URL: <strong>${escapeHtml(apiBaseUrl)}</strong></p>
        <p style="margin:0">x-api-token: <strong>${escapeHtml(apiToken)}</strong></p>
      </div>
    `
    : "";

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.55">
      <h2 style="margin:0 0 12px;font-size:22px">Finrep</h2>
      <p style="margin:0 0 18px">${escapeHtml(intro)}</p>
      <div style="border:1px solid #dbe2ec;padding:16px;margin:0 0 18px;background:#fbfcfe">
        <p style="margin:0 0 8px"><strong>${escapeHtml(heading)}</strong></p>
        <p style="margin:0 0 8px">Login URL: <a href="${escapeHtml(loginUrl())}">${escapeHtml(loginUrl())}</a></p>
        <p style="margin:0 0 8px">Login email: <strong>${escapeHtml(email)}</strong></p>
        <p style="margin:0">Password: <strong>${escapeHtml(password)}</strong></p>
      </div>
      ${apiTokenBlock}
    </div>
  `;
}

function otpHtml({ name, otp }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.55">
      <h2 style="margin:0 0 12px;font-size:22px">Finrep</h2>
      <p style="margin:0 0 18px">Hello ${escapeHtml(name)}, use this OTP to reset your password.</p>
      <div style="border:1px solid #dbe2ec;padding:16px;margin:0 0 18px;background:#fbfcfe">
        <p style="margin:0 0 8px">OTP</p>
        <strong style="font-size:28px;letter-spacing:0.24em">${escapeHtml(otp)}</strong>
      </div>
      <p style="margin:0;color:#475569">This OTP expires in 10 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `;
}

export async function sendInviteCredentialsEmail({ to, name, role, password, apiToken, apiBaseUrl = DEFAULT_PUBLIC_API_BASE_URL, invitedBy }) {
  const roleLabel = ROLE_LABELS[role] || role;
  const intro = `${invitedBy.name} invited you to Finrep as ${roleLabel}. Use the credentials below to sign in.`;
  const apiTokenText = apiToken
    ? [
        "",
        "Public API access:",
        `API Base URL: ${apiBaseUrl}`,
        `x-api-token: ${apiToken}`
      ]
    : [];

  return sendMail({
    to,
    subject: "Your Finrep login credentials",
    text: [
      `Hello ${name},`,
      "",
      intro,
      "",
      `Login URL: ${loginUrl()}`,
      `Login email: ${to}`,
      `Password: ${password}`,
      ...apiTokenText
    ].join("\n"),
    html: credentialHtml({
      heading: "Your account is ready",
      intro,
      email: to,
      password,
      apiToken,
      apiBaseUrl
    })
  });
}

export async function sendAccountReactivatedEmail({ to, name, role, password, apiToken, apiBaseUrl = DEFAULT_PUBLIC_API_BASE_URL, updatedBy }) {
  const roleLabel = ROLE_LABELS[role] || role;
  const actorName = updatedBy?.name || "Finrep";
  const intro = `${actorName} has unblocked your Finrep ${roleLabel} account. Use the latest credentials below to sign in.`;
  const apiTokenText = apiToken
    ? [
        "",
        "Public API access:",
        `API Base URL: ${apiBaseUrl}`,
        `x-api-token: ${apiToken}`
      ]
    : [];

  return sendMail({
    to,
    subject: "Your Finrep account has been unblocked",
    text: [
      `Hello ${name},`,
      "",
      intro,
      "",
      `Login URL: ${loginUrl()}`,
      `Login email: ${to}`,
      `Password: ${password || "Your existing password"}`,
      ...apiTokenText
    ].join("\n"),
    html: credentialHtml({
      heading: "Your account has been unblocked",
      intro,
      email: to,
      password: password || "Your existing password",
      apiToken,
      apiBaseUrl
    })
  });
}

export async function sendPasswordResetOtpEmail({ to, name, otp }) {
  return sendMail({
    to,
    subject: "Your Finrep password reset OTP",
    text: [
      `Hello ${name},`,
      "",
      "Use this OTP to reset your Finrep password.",
      "",
      `OTP: ${otp}`,
      "",
      "This OTP expires in 10 minutes. If you did not request it, you can ignore this email."
    ].join("\n"),
    html: otpHtml({ name, otp })
  });
}

