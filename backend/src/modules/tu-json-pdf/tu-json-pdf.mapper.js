import { mapInProfileTuPayload } from "./tu-json-pdf.inprofile-mapper.js";

export function mapTuJsonPayload(payload) {
  const normalizedPayload = normalizeAoPayPayload(payload);
  return {
    report: mapInProfileTuPayload(normalizedPayload),
    sourceSchema: "INPROFILE_CAIS"
  };
}

function normalizeAoPayPayload(payload) {
  const root = parseJsonValue(payload);
  const profile = findInProfileResponse(root);
  if (!profile) {
    throw new Error("AO Pay response does not contain an INProfileResponse report.");
  }
  return {
    request_id: findScalar(root, ["request_id", "requestId"]),
    client_ref_num: findScalar(root, ["client_ref_num", "clientRefNum", "reference_number"]),
    result: {
      result_json: {
        INProfileResponse: profile
      }
    }
  };
}

function findInProfileResponse(value, depth = 0, seen = new Set()) {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== "object" || depth > 12 || seen.has(parsed)) return null;
  seen.add(parsed);

  if (parsed.INProfileResponse && typeof parsed.INProfileResponse === "object") {
    return parsed.INProfileResponse;
  }

  for (const nested of Object.values(parsed)) {
    const profile = findInProfileResponse(nested, depth + 1, seen);
    if (profile) return profile;
  }
  return null;
}

function findScalar(value, keys, depth = 0, seen = new Set()) {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== "object" || depth > 8 || seen.has(parsed)) return "";
  seen.add(parsed);

  for (const key of keys) {
    const candidate = parsed[key];
    if (candidate !== undefined && candidate !== null && typeof candidate !== "object") {
      return String(candidate).trim();
    }
  }

  for (const nested of Object.values(parsed)) {
    const candidate = findScalar(nested, keys, depth + 1, seen);
    if (candidate) return candidate;
  }
  return "";
}

function parseJsonValue(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !["{", "["].includes(trimmed[0])) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}
