import mongoose from "mongoose";
import { badRequest, notFound } from "../../utils/http-error.js";
import { User } from "../users/user.model.js";
import { mapTuJsonPayload } from "./tu-json-pdf.mapper.js";
import { TuJsonPdfDocument } from "./tu-json-pdf.model.js";
import { renderTuReport } from "./tu-json-pdf.renderer.js";

const PROVIDER_URL =
  process.env.TU_JSON_PROVIDER_URL || "https://api.aopay.in/api/AOP/CreditAnalytics/Report";
const REGISTRATION_ID = process.env.TU_JSON_PROVIDER_REGISTRATION_ID || "AOP-5052";
const CONSENT_MESSAGE = "I agree to share my data for verification purposes";
const FIXED_OTP = "453986";
const FIXED_EMAIL = "accounts@thefinrep.com";
const FIXED_DATE_OF_BIRTH = "1992-01-10";
const AADHAAR_MOBILE_MISMATCH_MESSAGE =
  "Entered mobile number is not linked with Aadhaar. Please use the Aadhaar-linked mobile number.";

export async function generateTuJsonPdf(user, rawPayload) {
  const {
    providerRequest,
    providerResponse,
    report,
    sourceSchema,
    bytes,
    pageCount,
    customerName,
    scoreValue,
    fileName
  } = await generateTuPdfWithAopay(rawPayload);
  const actorId = user?.id || user?._id;

  const document = await TuJsonPdfDocument.create({
    actorId,
    actorName: user?.name || "",
    actorEmail: user?.email || "",
    actorRole: user?.role || "",
    customerName,
    score: Number.isFinite(scoreValue) ? scoreValue : null,
    accountCount: Array.isArray(report.accounts) ? report.accounts.length : 0,
    inquiryCount: Number(report?.inquirySummary?.total || report?.inquiries?.length || 0),
    controlNumber: report.controlNumber || "",
    sourceSchema,
    pageCount,
    fileName,
    providerRequest,
    providerResponse,
    pdfData: bytes
  });

  return serializeDocument(document);
}

export async function generateTuPdfWithAopay(rawPayload) {
  const { providerRequest, providerResponse } = await fetchTuJsonWithAopay(rawPayload);
  try {
    const rendered = await renderTuPdfFromAopayResponse(providerResponse);
    return { providerRequest, providerResponse, ...rendered };
  } catch (error) {
    error.providerAudit = {
      provider: "AO Pay",
      stage: "json-to-pdf",
      request: providerRequest,
      response: providerResponse,
      success: false,
      error: error instanceof Error ? error.message : "TU JSON to PDF conversion failed"
    };
    throw error;
  }
}

export async function fetchTuJsonWithAopay(rawPayload) {
  const providerRequest = normalizeProviderRequest(rawPayload);
  const providerResponse = await fetchProviderReport(providerRequest);
  return { providerRequest, providerResponse };
}

export async function renderTuPdfFromAopayResponse(providerResponse) {
  let mapped;
  try {
    mapped = mapTuJsonPayload(providerResponse);
  } catch (error) {
    throw badRequest(
      error instanceof Error
        ? `TU provider response could not be converted: ${error.message}`
        : "TU provider response could not be converted."
    );
  }

  const { report, sourceSchema } = mapped;
  const { bytes, pageCount } = await renderTuReport(report);
  const customerName = String(report?.customer?.name || "Customer").trim() || "Customer";
  const scoreValue = Number(String(report?.score?.value || "").replace(/,/g, ""));
  const fileName = `${slug(customerName)}-transunion-cibil-report.pdf`;
  return { report, sourceSchema, bytes, pageCount, customerName, scoreValue, fileName };
}

async function fetchProviderReport(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  let response;
  try {
    response = await fetch(PROVIDER_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw providerAuditError("TU provider request timed out. Please try again.", {
        provider: "AO Pay",
        stage: "request",
        request: payload,
        response: null,
        success: false,
        error: "Request timed out"
      });
    }
    throw providerAuditError("TU provider is currently unavailable. Please try again.", {
      provider: "AO Pay",
      stage: "request",
      request: payload,
      response: null,
      success: false,
      error: error instanceof Error ? error.message : "Provider request failed"
    });
  } finally {
    clearTimeout(timeout);
  }

  const rawResponse = await response.text();
  let data;
  try {
    data = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    throw providerAuditError("TU provider returned an invalid response.", {
      provider: "AO Pay",
      stage: "response",
      request: payload,
      response: { raw: rawResponse },
      httpStatus: response.status,
      success: false,
      error: "Invalid JSON response"
    });
  }

  const providerStatus = Number(data?.http_response_code);
  if (String(data?.result_code || "").trim() === "102") {
    const message = String(data?.message || AADHAAR_MOBILE_MISMATCH_MESSAGE).trim();
    throw providerAuditError(message, {
      provider: "AO Pay",
      stage: "response",
      request: payload,
      response: data,
      httpStatus: response.status,
      success: false,
      error: message
    });
  }
  if (!response.ok || providerStatus !== 200) {
    throw providerAuditError("Provider is unable to reach. Please contact administrator.", {
      provider: "AO Pay",
      stage: "response",
      request: payload,
      response: data,
      httpStatus: response.status,
      success: false,
      error: providerMessage(data) || "Provider returned a failed response"
    });
  }
  return data;
}

function providerAuditError(message, audit) {
  const error = badRequest(message);
  error.providerAudit = audit;
  return error;
}

function normalizeProviderRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw badRequest("Provide valid customer details.");
  }

  const firstName = cleanText(payload.firstName ?? payload.FirstName);
  const lastName = cleanText(payload.lastName ?? payload.LastName);
  const mobile = cleanText(payload.mobileNumber ?? payload.MobileNumber).replace(/\D/g, "");
  const pan = cleanText(payload.panNumber ?? payload.PanNumber).toUpperCase();
  const consentAccepted =
    payload.consentAccepted === true ||
    ["yes", "y", "true"].includes(
      cleanText(payload.consentAccepted ?? payload.ConsentAcceptance ?? payload.consent).toLowerCase()
    );
  if (!firstName) throw badRequest("First name is required.");
  if (!lastName) throw badRequest("Last name is required.");
  if (!/^\d{10}$/.test(mobile)) throw badRequest("Enter a valid 10-digit mobile number.");
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) throw badRequest("Enter a valid PAN number.");
  if (!consentAccepted) throw badRequest("Customer consent is required.");
  return {
    FirstName: firstName.toUpperCase(),
    LastName: lastName.toUpperCase(),
    MobileNumber: mobile,
    DateOfBirth: FIXED_DATE_OF_BIRTH,
    EmailID: FIXED_EMAIL,
    PanNumber: pan,
    OTP: FIXED_OTP,
    ConsentMessage: CONSENT_MESSAGE,
    ConsentAcceptance: "Yes",
    RegistrationID: REGISTRATION_ID
  };
}

function providerMessage(data) {
  return cleanText(
    data?.message ||
      data?.error ||
      data?.status ||
      data?.result?.message ||
      data?.result?.error ||
      ""
  );
}

function cleanText(value) {
  return String(value ?? "").trim();
}

export async function listTuJsonPdfDocuments(user, query = {}) {
  const page = clampInteger(query.page, 1, Number.MAX_SAFE_INTEGER, 1);
  const limit = clampInteger(query.limit, 1, 50, 10);
  const filter = await visibilityFilter(user);
  const search = String(query.search || "").trim();
  if (search) {
    const pattern = new RegExp(escapeRegExp(search), "i");
    filter.$or = [
      { customerName: pattern }, { controlNumber: pattern }, { actorName: pattern },
      { actorEmail: pattern }, { sourceSchema: pattern }
    ];
  }

  const [items, total] = await Promise.all([
    TuJsonPdfDocument.find(filter).select("-pdfData").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    TuJsonPdfDocument.countDocuments(filter)
  ]);
  return {
    items: items.map(serializeDocument),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
  };
}

export async function getTuJsonPdfFile(user, documentId) {
  if (!mongoose.isValidObjectId(documentId)) throw notFound("Generated PDF not found.");
  const filter = await visibilityFilter(user);
  filter._id = documentId;
  const document = await TuJsonPdfDocument.findOne(filter);
  if (!document?.pdfData?.length) throw notFound("Generated PDF not found.");
  return { bytes: document.pdfData, fileName: document.fileName, contentType: document.contentType || "application/pdf" };
}

async function visibilityFilter(user) {
  if (user?.role === "super_admin") return {};
  return { actorId: { $in: await descendantIds(user?.id || user?._id) } };
}

async function descendantIds(rootId) {
  const result = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const children = await User.find({ parent: { $in: frontier } }).select("_id").lean();
    frontier = children.map((entry) => entry._id);
    result.push(...frontier);
  }
  return result;
}

function serializeDocument(document) {
  const value = typeof document?.toObject === "function" ? document.toObject() : document;
  return {
    id: String(value?._id || value?.id || ""),
    customerName: value?.customerName || "-",
    score: value?.score ?? null,
    accountCount: value?.accountCount || 0,
    inquiryCount: value?.inquiryCount || 0,
    controlNumber: value?.controlNumber || "",
    sourceSchema: value?.sourceSchema || "",
    pageCount: value?.pageCount || 1,
    fileName: value?.fileName || "transunion-cibil-report.pdf",
    actorId: value?.actorId ? String(value.actorId) : "",
    actorName: value?.actorName || "",
    actorEmail: value?.actorEmail || "",
    actorRole: value?.actorRole || "",
    createdAt: value?.createdAt || null
  };
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "customer";
}

function clampInteger(value, minimum, maximum, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
