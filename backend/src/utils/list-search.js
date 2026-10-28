const ROLE_LABELS = {
  super_admin: "Super Admin",
  agent: "Agent",
  sub_agent: "Sub Agent",
  user: "User"
};

const MONTHS = [
  ["jan", "january"],
  ["feb", "february"],
  ["mar", "march"],
  ["apr", "april"],
  ["may"],
  ["jun", "june"],
  ["jul", "july"],
  ["aug", "august"],
  ["sep", "sept", "september"],
  ["oct", "october"],
  ["nov", "november"],
  ["dec", "december"]
];

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function searchPattern(value) {
  const term = String(value || "").trim();
  return term ? new RegExp(escapeRegex(term), "i") : null;
}

export function roleSearchValues(value) {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  return Object.entries(ROLE_LABELS)
    .filter(([role, label]) => normalizeSearchText(role).includes(normalized) || normalizeSearchText(label).includes(normalized))
    .map(([role]) => role);
}

export function dateSearchClauses(field, value) {
  const ranges = dateSearchRanges(value);
  return ranges.map(({ start, end }) => ({ [field]: { $gte: start, $lte: end } }));
}

export function amountPaiseSearchClauses(fields, value) {
  const numeric = numericSearchValue(value);
  if (!Number.isFinite(numeric)) return [];
  const paise = Math.round(numeric * 100);
  return fields.flatMap((field) => [
    { [field]: paise },
    { [field]: -paise }
  ]);
}

export function unitSearchClauses(fields, value) {
  const numeric = numericSearchValue(value);
  if (!Number.isFinite(numeric)) return [];
  const units = Math.round(numeric * 100);
  return fields.flatMap((field) => [
    { [field]: units },
    { [field]: -units }
  ]);
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function numericSearchValue(value) {
  const clean = String(value || "").replace(/[₹,\s]/g, "").replace(/^rs\.?/i, "");
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return NaN;
  return Number(clean);
}

function dateSearchRanges(value) {
  const term = String(value || "").trim();
  if (!term) return [];

  const isoDate = term.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoDate) return [dayRange(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]))];

  const slashDate = term.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (slashDate) return [dayRange(Number(slashDate[3]), Number(slashDate[2]) - 1, Number(slashDate[1]))];

  const parsed = Date.parse(term);
  if ((/[a-z]/i.test(term) || /[, ]/.test(term)) && !Number.isNaN(parsed)) {
    const date = new Date(parsed);
    return [dayRange(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())];
  }

  const year = Number(term.match(/\b(19\d{2}|20\d{2})\b/)?.[1] || 0);
  const monthIndex = MONTHS.findIndex((aliases) => aliases.some((month) => term.toLowerCase().includes(month)));
  if (year && monthIndex >= 0) return [monthRange(year, monthIndex)];
  if (year && /^\d{4}$/.test(term)) return [{ start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)) }];

  return [];
}

function dayRange(year, month, day) {
  return {
    start: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
  };
}

function monthRange(year, month) {
  return {
    start: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))
  };
}
