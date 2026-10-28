// Maps a BEFISC / SmartAuth TU CIBIL response (TransUnion "TrueLinkCreditReport"
// schema) into the normalized report object consumed by renderTuReport().
// This mirrors the output shape of tu-json-pdf.inprofile-mapper.js so the same
// PDF template renders both AO Pay (INProfile) and BEFISC (TrueLink) data.

const ACCOUNT_TYPES = {
  "00": "OTHER", "01": "AUTO LOAN (PERSONAL)", "02": "HOUSING LOAN", "03": "PROPERTY LOAN",
  "04": "LOAN AGAINST SHARES / SECURITIES", "05": "PERSONAL LOAN", "06": "CONSUMER LOAN",
  "07": "GOLD LOAN", "08": "EDUCATION LOAN", "09": "LOAN TO PROFESSIONAL", "10": "CREDIT CARD",
  "11": "LEASING", "12": "OVERDRAFT", "13": "TWO WHEELER LOAN", "14": "NON-FUNDED CREDIT FACILITY",
  "15": "LOAN AGAINST BANK DEPOSIT", "16": "FLEET CARD", "17": "COMMERCIAL VEHICLE LOAN",
  "31": "SECURED CREDIT CARD", "32": "USED CAR LOAN", "33": "CONSTRUCTION EQUIPMENT LOAN",
  "34": "TRACTOR LOAN", "35": "CORPORATE CREDIT CARD", "36": "KISAN CREDIT CARD",
  "37": "LOAN ON CREDIT CARD", "38": "JAN-DHAN YOJANA OVERDRAFT", "39": "MUDRA LOAN",
  "40": "MICROFINANCE - BUSINESS LOAN", "41": "MICROFINANCE - PERSONAL LOAN",
  "42": "MICROFINANCE - HOUSING LOAN", "43": "MICROFINANCE - OTHER", "44": "PRADHAN MANTRI AWAS YOJANA",
  "45": "P2P PERSONAL LOAN", "46": "P2P AUTO LOAN", "47": "P2P EDUCATION LOAN",
  "48": "BUSINESS LOAN - UNSECURED", "50": "BUSINESS LOAN - SECURED", "51": "BUSINESS LOAN - GENERAL"
};

const STATE_NAMES = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Daman and Diu", "26": "Dadra and Nagar Haveli", "27": "Maharashtra", "28": "Andhra Pradesh",
  "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh"
};

const PAYMENT_FREQUENCY = { "01": "Weekly", "02": "Fortnightly", "03": "Monthly", "04": "Quarterly", "05": "Half Yearly", "06": "Yearly" };
const PHONE_TYPES = { "00": "Telephone", "01": "Mobile", "02": "Home", "03": "Office" };

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function text(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

// TrueLink uses -1 / -8 / "" as "not reported" sentinels.
function isMissing(value) {
  const raw = text(value);
  return raw === "" || raw === "-1" || raw === "-8" || raw === "-9";
}

function number(value) {
  if (isMissing(value)) return 0;
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : (Number.isFinite(n) ? n : 0);
}

function amount(value) {
  if (isMissing(value)) return "-";
  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n < 0) return "-";
  return n.toLocaleString("en-IN");
}

// "2026-02-06+05:30" or "2026-02-06" -> "06-02-2026"
function formatDate(value) {
  const raw = text(value).split("+")[0];
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "-";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// {year,month,day} -> "DD-MM-YYYY"
function formatBirthDate(birth = {}) {
  const y = text(birth.year), mo = text(birth.month), d = text(birth.day);
  if (!y || !mo || !d) return "-";
  return `${d.padStart(2, "0")}-${mo.padStart(2, "0")}-${y}`;
}

// "2026-10-01+05:30" -> "Oct 2026"
function monthLabel(value) {
  const raw = text(value).split("+")[0];
  const m = raw.match(/^(\d{4})-(\d{2})/);
  if (!m) return "-";
  return `${MONTHS[Number(m[2])] || m[2]} ${m[1]}`;
}

function arrayOf(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

function symbol(node) {
  return text(node && typeof node === "object" ? node.symbol : node);
}

function accountTypeLabel(code) {
  const raw = text(code);
  if (!raw) return "-";
  const normalized = raw.padStart(2, "0");
  return ACCOUNT_TYPES[normalized] || raw;
}

function unique(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

function uniqueBy(list, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function getTrueLinkReport(providerBody) {
  const root = providerBody?.result?.cibilData || providerBody?.cibilData || providerBody;
  return (
    root?.GetCustomerAssetsResponse?.GetCustomerAssetsSuccess?.Asset?.TrueLinkCreditReport ||
    root?.TrueLinkCreditReport ||
    null
  );
}

function mapAddress(entry = {}) {
  const credit = entry.CreditAddress || {};
  const stateCode = text(credit.Region).padStart(2, "0");
  const address = [
    credit.StreetAddress,
    credit.City,
    STATE_NAMES[stateCode] || credit.Region,
    credit.PostalCode
  ].map(text).filter(Boolean).join(", ");
  return { address, category: "Reported", residenceCode: "-", dateReported: formatDate(entry.dateReported) };
}

function mapPhone(entry = {}) {
  const num = text(entry?.PhoneNumber?.Number);
  return { type: PHONE_TYPES[symbol(entry.PhoneType)] || "Phone", number: num || "-", extension: "-" };
}

function mapHistory(granted = {}) {
  const monthly = granted?.PayStatusHistory?.MonthlyPayStatus || {};
  return Object.values(monthly)
    .map((item) => ({ month: monthLabel(item?.date), status: normalizeStatus(item?.status) }))
    .filter((item) => item.month !== "-");
}

function normalizeStatus(status) {
  const raw = text(status);
  if (raw === "" || raw === "-1") return "-";
  if (/^\d+$/.test(raw)) return Number(raw) === 0 ? "STD" : raw.padStart(3, "0");
  return raw;
}

function isOnTimeStatus(status) {
  return ["STD", "000", "0", "XXX"].includes(text(status).toUpperCase());
}

function mapTradeline(partition = {}) {
  const tl = partition.Tradeline || {};
  const granted = tl.GrantedTrade || {};
  const typeCode = symbol(granted.AccountType) || text(partition.accountTypeSymbol);
  const type = accountTypeLabel(typeCode);
  const history = mapHistory(granted);
  const open = symbol(tl.OpenClosed);
  const closed = open === "02" || Boolean(text(tl.dateClosed) && !isMissing(tl.dateClosed));
  return {
    lender: text(tl.creditorName) || "-",
    type,
    accountNumber: text(tl.accountNumber) || "-",
    ownership: "-",
    status: closed ? "Closed" : "Open",
    creditLimit: amount(granted.CreditLimit),
    cashLimit: amount(granted.CashLimit),
    highCredit: amount(tl.highBalance),
    currentBalance: amount(tl.currentBalance),
    amountOverdue: amount(granted.amountPastDue),
    interestRate: isMissing(granted.interestRate) || Number(granted.interestRate) < 0 ? "-" : text(granted.interestRate),
    emiAmount: amount(granted.EMIAmount),
    repaymentTenure: isMissing(granted.termMonths) ? "-" : text(granted.termMonths),
    actualPayment: amount(granted.actualPaymentAmount),
    paymentFrequency: PAYMENT_FREQUENCY[symbol(granted.PaymentFrequency)] || "-",
    dateOpened: formatDate(tl.dateOpened),
    dateClosed: formatDate(tl.dateClosed),
    collateralType: "-",
    collateralValue: amount(granted.collateral),
    writtenOffTotal: amount(tl.writtenOffAmtTotal),
    writtenOffPrincipal: amount(tl.writtenOffPrincipal),
    settlementAmount: amount(tl.settlementAmount),
    dateLastPayment: formatDate(granted.dateLastPayment),
    dateReported: formatDate(tl.dateReported),
    facilityStatus: closed ? "Closed" : "Active",
    historyFrom: history.at(-1)?.month || "-",
    historyTo: history[0]?.month || "-",
    history,
    _isCreditCard: typeCode === "10" || typeCode === "31" || typeCode === "35"
  };
}

function mapInquiry(entry = {}) {
  const inq = entry.Inquiry || {};
  return {
    member: text(inq.subscriberName) || "-",
    date: formatDate(inq.inquiryDate),
    purpose: accountTypeLabel(inq.inquiryType),
    amount: amount(inq.amount)
  };
}

function summarizeAccounts(accounts) {
  const dates = accounts.map((a) => a.dateOpened).filter((d) => d !== "-").sort(compareDates);
  return {
    total: accounts.length,
    active: accounts.filter((a) => a.status === "Open").length,
    closed: accounts.filter((a) => a.status === "Closed").length,
    zeroBalance: accounts.filter((a) => number(a.currentBalance) === 0).length,
    overdueAccounts: accounts.filter((a) => number(a.amountOverdue) > 0).length,
    currentBalance: accounts.reduce((t, a) => t + number(a.currentBalance), 0),
    sanctionedAmount: accounts.reduce((t, a) => t + number(a.highCredit), 0),
    overdueAmount: accounts.reduce((t, a) => t + number(a.amountOverdue), 0),
    oldestDate: dates[0] || "-",
    recentDate: dates.at(-1) || "-"
  };
}

function compareDates(a, b) {
  return toTime(a) - toTime(b);
}

function toTime(value) {
  const m = text(value).match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime();
}

function monthsSince(dateStr) {
  const m = text(dateStr).match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return null;
  const then = new Date(`${m[3]}-${m[2]}-${m[1]}`);
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  return Math.max(0, (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth()));
}

function isRecent(dateStr, days) {
  const m = text(dateStr).match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return false;
  const then = new Date(`${m[3]}-${m[2]}-${m[1]}`);
  if (Number.isNaN(then.getTime())) return false;
  return (Date.now() - then.getTime()) / 86400000 <= days;
}

export function mapBefiscTuPayload(providerBody, requestContext = {}) {
  const report = getTrueLinkReport(providerBody);
  if (!report) {
    throw new Error("BEFISC response does not contain a TrueLinkCreditReport.");
  }

  const borrower = report.Borrower || {};
  const partitions = report.TradeLinePartition && typeof report.TradeLinePartition === "object"
    ? Object.keys(report.TradeLinePartition)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => report.TradeLinePartition[key])
        .filter((p) => p && typeof p === "object" && p.Tradeline)
    : [];
  const accounts = partitions.map(mapTradeline);
  const inquiries = arrayOf(report.InquiryPartition).map(mapInquiry);

  const addresses = uniqueBy(
    arrayOf(borrower.BorrowerAddress).map(mapAddress).filter((a) => a.address),
    (a) => a.address.toLowerCase()
  );
  const phones = uniqueBy(
    arrayOf(borrower.BorrowerTelephone).map(mapPhone).filter((p) => p.number !== "-"),
    (p) => p.number
  );
  const emails = unique(arrayOf(borrower.EmailAddress).map((e) => text(e?.Email || e)));
  const employers = uniqueBy(
    arrayOf(borrower.Employer).map((e) => ({
      name: text(e?.EmployerName || e?.name) || "-",
      occupation: "-",
      income: "-",
      netGross: "-",
      frequency: "-",
      accountType: "-",
      dateReported: formatDate(e?.dateReported)
    })).filter((e) => e.name !== "-"),
    (e) => e.name.toLowerCase()
  );

  // PAN / identifiers
  const identifiers = [];
  const pan = text(requestContext.pan) ||
    findPan(borrower.IdentifierPartition);
  if (pan) identifiers.push({ type: "Income Tax PAN", number: pan, issueDate: "-", expirationDate: "-" });

  const score = borrower.CreditScore || {};
  const scoreValue = isMissing(score.riskScore) ? "-" : text(score.riskScore);
  const factors = arrayOf(score.CreditScoreFactor)
    .map((f) => arrayOf(f?.FactorText).map(text).join(" ").trim())
    .filter(Boolean)
    .slice(0, 5);

  const accountSummary = summarizeAccounts(accounts);
  const historyEntries = accounts.flatMap((a) => a.history);
  const onTime = historyEntries.filter((e) => isOnTimeStatus(e.status)).length;
  const creditLimits = accounts.filter((a) => a._isCreditCard).reduce((t, a) => t + number(a.creditLimit), 0);
  const cardBalances = accounts.filter((a) => a._isCreditCard).reduce((t, a) => t + number(a.currentBalance), 0);
  const oldestMonths = monthsSince(accountSummary.oldestDate);
  const customerName = text(borrower?.BorrowerName?.Name?.Forename) ||
    text(borrower?.BorrowerName?.Name?.FirstName);

  const built = {
    provider: "TransUnion CIBIL",
    transactionId: text(providerBody?.txn_id),
    clientId: text(providerBody?.result?.client_id),
    controlNumber: text(report?.ReferenceKey) || text(providerBody?.txn_id) || "-",
    reportDate: formatDate(providerBody?.datetime) !== "-" ? formatDate(providerBody?.datetime) : formatDate(borrower?.Birth?.Source?.InquiryDate),
    reportTime: "-",
    memberId: "-",
    memberReference: text(requestContext.mobile) || "-",
    customer: {
      name: customerName || "-",
      dob: formatBirthDate(borrower?.Birth?.BirthDate),
      gender: genderLabel(symbol(borrower.Gender))
    },
    score: {
      name: text(score.scoreName) || "CIBIL SCORE",
      value: scoreValue,
      factors,
      populationRank: isMissing(score.populationRank) ? "-" : text(score.populationRank)
    },
    creditSummary: {
      utilization: creditLimits > 0 ? `${Math.round((cardBalances / creditLimits) * 100)}%` : "-",
      creditMix: `${unique(accounts.map((a) => a.type).filter(Boolean)).length} account type(s)`,
      enquiries: String(inquiries.length || 0),
      oldestAccountPeriod: oldestMonths === null ? "-" : `${oldestMonths} months`,
      onTimePaymentHistory: historyEntries.length ? `${Math.round((onTime / historyEntries.length) * 100)}%` : "-"
    },
    identifiers,
    phones,
    emails,
    addresses,
    employers,
    accounts: accounts.map(stripInternal),
    accountSummary,
    inquiries,
    inquirySummary: {
      total: inquiries.length,
      past30Days: inquiries.filter((e) => isRecent(e.date, 30)).length,
      past12Months: inquiries.filter((e) => isRecent(e.date, 365)).length,
      past24Months: inquiries.filter((e) => isRecent(e.date, 730)).length,
      recentDate: inquiries.map((e) => e.date).filter((d) => d !== "-").sort(compareDates).at(-1) || "-"
    },
    safetyCheckPassed: report?.SafetyCheckPassed === true ? "Yes" : report?.SafetyCheckPassed === false ? "No" : "-",
    frozen: text(report?.Frozen) || "-",
    deceasedIndicator: report?.DeceasedIndicator ? "Yes" : "No",
    fraudIndicator: report?.FraudIndicator ? "Yes" : "No"
  };

  return { report: built, sourceSchema: "BEFISC_TRUELINK" };
}

function stripInternal(account) {
  const { _isCreditCard, ...rest } = account;
  return rest;
}

function genderLabel(code) {
  const raw = text(code).toUpperCase();
  if (raw === "1" || raw === "M" || raw === "MALE") return "Male";
  if (raw === "2" || raw === "F" || raw === "FEMALE") return "Female";
  return "-";
}

function findPan(identifierPartition) {
  for (const part of arrayOf(identifierPartition)) {
    const id = part?.Identifier || part;
    const value = text(id?.IdentifierName || id?.ID || id?.value);
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)) return value;
  }
  return "";
}
