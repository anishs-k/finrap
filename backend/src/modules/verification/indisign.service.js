import { env } from "../../config/env.js";
import { unprocessable } from "../../utils/http-error.js";

const SIGNER_ROLE = "Signer";
const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function createIndisignEsignRequest({ name, email, phone, documentTitle, documentFileName, documentFileDataUrl }) {
  const cleanTitle = String(documentTitle || "").trim() || `${name} Aadhaar eSign`;
  const file = parsePdfDataUrl({ documentFileDataUrl, documentFileName });

  const uploadForm = new FormData();
  uploadForm.append("file", new Blob([file.buffer], { type: "application/pdf" }), file.fileName);
  uploadForm.append("title", cleanTitle);

  const uploadResponse = await indisignRequest("/documents/upload", {
    method: "POST",
    body: uploadForm
  });
  const documentId = firstString(
    uploadResponse?.document?.id,
    uploadResponse?.document?._id,
    uploadResponse?.document?.document_id,
    uploadResponse?.document?.documentId,
    uploadResponse?.data?.document?.id,
    uploadResponse?.data?.document?._id,
    uploadResponse?.data?.document_id,
    uploadResponse?.data?.documentId,
    uploadResponse?.document_id,
    uploadResponse?.documentId,
    uploadResponse?.id,
    uploadResponse?._id
  );
  if (!documentId) {
    throw unprocessable("IndiSign document upload did not return a document id");
  }

  const blueprintResponse = await createBlueprintWithFallback({ documentId, cleanTitle });
  const blueprintId = firstString(
    blueprintResponse?.blueprint?.id,
    blueprintResponse?.blueprint?._id,
    blueprintResponse?.blueprint?.blueprint_id,
    blueprintResponse?.blueprint?.blueprintId,
    blueprintResponse?.data?.blueprint?.id,
    blueprintResponse?.data?.blueprint?._id,
    blueprintResponse?.data?.blueprint_id,
    blueprintResponse?.data?.blueprintId,
    blueprintResponse?.blueprint_id,
    blueprintResponse?.blueprintId,
    blueprintResponse?.id,
    blueprintResponse?._id
  );
  if (!blueprintId) {
    throw unprocessable("IndiSign blueprint creation did not return a blueprint id");
  }

  const envelopeResponse = await indisignJson("/envelopes", {
    blueprint_id: blueprintId,
    email_subject: `Please sign ${cleanTitle}`,
    email_body: "Please review and sign the attached document.",
    email_from_name: "Finrep",
    signing_order: "sequential",
    reminder_enabled: true,
    reminder_interval_days: 2
  });
  const envelopeId = firstString(
    envelopeResponse?.envelope?.id,
    envelopeResponse?.envelope?._id,
    envelopeResponse?.envelope?.envelope_id,
    envelopeResponse?.envelope?.envelopeId,
    envelopeResponse?.data?.envelope?.id,
    envelopeResponse?.data?.envelope?._id,
    envelopeResponse?.data?.envelope_id,
    envelopeResponse?.data?.envelopeId,
    envelopeResponse?.envelope_id,
    envelopeResponse?.envelopeId,
    envelopeResponse?.id,
    envelopeResponse?._id
  );
  if (!envelopeId) {
    throw unprocessable("IndiSign envelope creation did not return an envelope id");
  }

  const recipientResponse = await indisignJson(`/envelopes/${encodeURIComponent(envelopeId)}/recipients`, {
    recipients: [
      {
        name,
        email,
        phone: `+91${phone}`,
        role_name: SIGNER_ROLE,
        signer_order: 1
      }
    ]
  });

  const sendResponse = await indisignJson(`/envelopes/${encodeURIComponent(envelopeId)}/send`, {});

  return {
    provider: "indisign",
    documentId,
    blueprintId,
    envelopeId,
    documentTitle: cleanTitle,
    documentFileName: file.fileName,
    recipientName: name,
    recipientEmail: email,
    recipientPhone: phone,
    uploadResponse,
    blueprintResponse,
    envelopeResponse,
    recipientResponse,
    sendResponse
  };
}

export async function fetchIndisignSigningStatus({ envelopeId }) {
  const cleanEnvelopeId = String(envelopeId || "").trim();
  if (!cleanEnvelopeId) {
    throw unprocessable("IndiSign envelope id is missing");
  }

  return indisignRequest(`/envelopes/${encodeURIComponent(cleanEnvelopeId)}/signing-status`, {
    method: "GET"
  });
}

export async function fetchIndisignSignedDocument({ envelopeId }) {
  const cleanEnvelopeId = String(envelopeId || "").trim();
  if (!cleanEnvelopeId) {
    throw unprocessable("IndiSign envelope id is missing");
  }

  return indisignRequest(`/envelopes/${encodeURIComponent(cleanEnvelopeId)}/download-agreement`, {
    method: "GET"
  });
}

async function indisignJson(path, payload) {
  return indisignRequest(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function createBlueprintWithFallback({ documentId, cleanTitle }) {
  const variants = [
    {
      [SIGNER_ROLE]: {
        sign: {
          exists: true,
          signs: [signatureField()]
        }
      }
    }
  ];
  let lastError = null;

  for (const fields of variants) {
    try {
      return await indisignJson("/blueprints", {
        document_id: documentId,
        name: `${cleanTitle} Blueprint`,
        signer_roles: [SIGNER_ROLE],
        signing_order: "sequential",
        expiration_days: 7,
        fields
      });
    } catch (err) {
      lastError = err;
      if (!/invalid fields structure/i.test(String(err?.message || ""))) {
        throw err;
      }
    }
  }

  throw lastError || unprocessable("IndiSign request failed: Invalid fields structure");
}

function signatureField() {
  return {
    type: "aadhaar",
    position: {
      page: 1,
      top: 500,
      left: 100
    },
    dimensions: {
      width: 200,
      height: 50
    }
  };
}

async function indisignRequest(path, init) {
  const baseUrl = String(env.indisign?.baseUrl || "").replace(/\/+$/, "");
  const apiKey = String(env.indisign?.apiKey || "").trim();
  if (!baseUrl || !apiKey) {
    throw unprocessable("IndiSign API credentials are not configured");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers || {})
    }
  });

  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `IndiSign request failed with status ${response.status}`;
    throw unprocessable(`IndiSign request failed: ${message}`);
  }

  return payload;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function parsePdfDataUrl({ documentFileDataUrl, documentFileName }) {
  const rawValue = String(documentFileDataUrl || "");
  const dataUrlMatch = rawValue.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = dataUrlMatch?.[1] || "";
  const base64 = dataUrlMatch?.[2] || rawValue;
  if (!base64) {
    throw unprocessable("PDF document is required");
  }
  if (mimeType && !/pdf/i.test(mimeType)) {
    throw unprocessable("Only PDF documents are allowed");
  }

  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.slice(0, 4).toString() !== "%PDF") {
    throw unprocessable("Upload a valid PDF document");
  }
  if (buffer.length > MAX_PDF_BYTES) {
    throw unprocessable("PDF document must be 50MB or smaller");
  }

  return {
    buffer,
    fileName: normalizePdfFileName(documentFileName)
  };
}

function normalizePdfFileName(value) {
  const safeName = String(value || "document.pdf")
    .trim()
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-");
  return /\.pdf$/i.test(safeName) ? safeName : `${safeName || "document"}.pdf`;
}
