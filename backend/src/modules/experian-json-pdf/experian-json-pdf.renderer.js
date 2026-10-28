import { PDFDocument, PageSizes, StandardFonts, rgb } from "pdf-lib";

const W = PageSizes.A4[0];
const H = PageSizes.A4[1];
const M = 14;
const BLACK = rgb(0.06, 0.06, 0.06);
const BLUE = rgb(0.08, 0.38, 0.66);
const DARK_BLUE = rgb(0.03, 0.18, 0.34);
const PURPLE = rgb(0.42, 0.13, 0.51);
const MAGENTA = rgb(0.72, 0.1, 0.42);
const GREEN = rgb(0.08, 0.62, 0.3);
const PALE_GREEN = rgb(0.54, 0.86, 0.46);
const YELLOW = rgb(1, 0.83, 0.08);
const ORANGE = rgb(0.98, 0.39, 0.1);
const RED = rgb(0.94, 0.06, 0.1);
const AMBER_TEXT = rgb(0.82, 0.55, 0.02);
const GREY = rgb(0.36, 0.4, 0.44);
const LIGHT = rgb(0.94, 0.94, 0.94);
const LINE = rgb(0.83, 0.84, 0.85);
const WHITE = rgb(1, 1, 1);

export async function renderExperianReport(report) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const state = { pdf, fonts: { regular, bold, serif }, page: null, y: 0, pageNumber: 0, report };

  addPage(state);
  drawApplication(state);
  drawScore(state);
  drawReportSummary(state);
  drawAccountSummary(state);
  drawAccounts(state);
  drawEnquiries(state);
  drawClosing(state);

  return { bytes: Buffer.from(await pdf.save()), pageCount: pdf.getPageCount() };
}

function drawApplication(state) {
  const report = state.report || {};
  const customer = report.customer || {};
  const application = report.currentApplication || {};
  section(state, "CURRENT APPLICATION INFORMATION");
  grid(state, [
    ["Name", application.name || customer.name],
    ["Date of Birth", date(application.dob || customer.dob)],
    ["Ration Card", customer.rationCard],
    ["Mobile Phone", customer.mobile],
    ["PAN", maskPan(application.pan || customer.pan)],
    ["Driving License", customer.drivingLicense],
    ["Passport Number", customer.passport],
    ["Voter ID", customer.voterId],
    ["Email", customer.email],
    ["Aadhaar Number", customer.aadhaar]
  ], 3);
}

function drawScore(state) {
  ensure(state, 160);
  section(state, "EXPERIAN CREDIT SCORE");
  text(state, "Your Experian Credit Report is summarized in the form of Experian Credit Score which ranges from 300 - 900.", M + 4, state.y, 5.8, state.fonts.regular, AMBER_TEXT);
  state.y -= 12;
  const score = num(state.report?.score?.value);
  const top = state.y;
  meter(state, Number.isFinite(score) ? score : 300, M + 70, top - 56, 54);
  text(state, "Score Factors", M + 145, top - 3, 6.6, state.fonts.bold, BLACK);
  [
    "Recency: Recent Credit Account Defaults",
    "Leverage: Credit Accounts with on-time re-payment history",
    "Coverage: Non-delinquent and delinquent Credit Accounts",
    "Delinquency Status: Defaults or Credit Accounts",
    "Credit Applications: Credit Account Applications over last 30 days"
  ].forEach((item, index) => text(state, `${index + 1}. ${item}`, M + 145, top - 18 - index * 15, 5.4, state.fonts.regular, GREY));
  state.y = top - 120;
}

function drawReportSummary(state) {
  const report = state.report || {};
  const accounts = list(report.accounts);
  const active = accounts.filter((account) => !closed(account)).length;
  const closedCount = accounts.length - active;
  section(state, "REPORT SUMMARY");
  grid(state, [
    ["Credit Account Summary", ""],
    ["Credit Balance Summary", ""],
    ["Credit Enquiry Summary", ""],
    ["Non-Credit Enquiry Summary", ""],
    ["Total number of Accounts", accounts.length],
    ["Total Current Bal. amt", money(sum(accounts.map((account) => account.currentBalance)))],
    ["Last 7 days credit enquiries", countRecent(report.inquiries, 7)],
    ["Last 7 days non-credit enquiries", countRecent(report.nonCreditInquiries, 7)],
    ["Active Accounts", active],
    ["SFW/WO/Settled amt.", money(sum(accounts.map((account) => account.writtenOffTotal || account.settlementAmount)))],
    ["Last 30 days credit enquiries", countRecent(report.inquiries, 30)],
    ["Last 30 days non-credit enquiries", countRecent(report.nonCreditInquiries, 30)],
    ["Closed Accounts", closedCount],
    ["Secured Accounts amt.", money(sum(accounts.filter(isSecured).map((account) => account.highCredit)))],
    ["Last 90 days credit enquiries", countRecent(report.inquiries, 90)],
    ["Last 90 days non-credit enquiries", countRecent(report.nonCreditInquiries, 90)],
    ["SFW/WO/SET/RES", accounts.filter(hasWrittenOffStatus).length],
    ["Unsecured Accounts amt.", money(sum(accounts.filter((account) => !isSecured(account)).map((account) => account.highCredit)))],
    ["Last 180 days credit enquiries", countRecent(report.inquiries, 180)],
    ["Last 180 days non-credit enquiries", countRecent(report.nonCreditInquiries, 180)]
  ], 4);
}

function drawAccountSummary(state) {
  const accounts = list(state.report?.accounts);
  ensure(state, 75 + accounts.length * 18);
  section(state, "SUMMARY");
  noteLine(state, "This section displays summary of all your reported credit accounts found in the Experian Credit Bureau database");
  const columns = [
    ["Sr.no", 0.05], ["Account Type", 0.19], ["Account No", 0.17], ["Date Reported", 0.1],
    ["Account Status", 0.1], ["Date Opened", 0.1], ["Currency code", 0.07], ["Sanction Amt / Highest Credit", 0.1],
    ["Current Balance", 0.07], ["Overdue Amount", 0.05]
  ];
  tableHeader(state, columns);
  accounts.forEach((account, index) => tableRow(state, [
    `Acc${index + 1}`,
    account.type,
    maskAccount(account.accountNumber),
    date(account.dateReported),
    closed(account) ? "CLOSED" : account.status || "ACTIVE",
    date(account.dateOpened),
    account.currency || "INR",
    plainNumber(account.highCredit || account.creditLimit),
    plainNumber(account.currentBalance),
    plainNumber(account.amountOverdue)
  ], columns.map((column) => column[1]), 18));
  state.y -= 7;
  section(state, "CREDIT ACCOUNT INFORMATION DETAILS");
  noteLine(state, "This section has information based on the details provided to Experian by member banks, credit / financial institutions and other credit grantors with whom you have a credit / loan account.");
}

function drawAccounts(state) {
  const accounts = list(state.report?.accounts);
  if (!accounts.length) {
    notice(state, "No credit account information was returned by the bureau.");
    return;
  }
  accounts.forEach((account, index) => {
    ensure(state, 240);
    consumerBar(state, account, `Acct. ${index + 1}`);
    text(state, "Credit Account details", M, state.y, 6, state.fonts.bold, BLUE);
    state.y -= 9;
    const fields = [
      ["Account Terms", ""], ["Account Description", ""], ["Account Details", ""],
      ["Account Number", maskAccount(account.accountNumber)], ["Date Reported", date(account.dateReported)], ["Credit Limit Amt", plainNumber(account.creditLimit)],
      ["Date Opened", date(account.dateOpened)], ["Loan Type", account.type], ["Repayment Tenure", account.repaymentTenure],
      ["Date Closed", date(account.dateClosed)], ["Account Status", closed(account) ? "CLOSED" : account.status || "ACTIVE"], ["Total Write-off Amt", plainNumber(account.writtenOffTotal)],
      ["Ownership", account.ownership], ["Current Balance", plainNumber(account.currentBalance)], ["Principal Write-off", plainNumber(account.writtenOffPrincipal)],
      ["Rate of Interest", account.interestRate], ["Amount Overdue", plainNumber(account.amountOverdue)], ["Settlement Amt", plainNumber(account.settlementAmount)],
      ["Value of Collateral", plainNumber(account.collateralValue)], ["Last Payment Date", date(account.lastPaymentDate)], ["Written off Settled Status", account.writtenOffStatus],
      ["Type of Collateral", account.collateralType], ["SuitFiled Willful Default", account.suitFiledStatus], ["Cash Limit", plainNumber(account.cashLimit)]
    ];
    grid(state, fields, 3);
    state.y -= 8;
    paymentHistory(state, account.history);
    state.y -= 4;
    personalDetails(state, account);
    state.y -= 10;
  });
}

function consumerBar(state, account, label) {
  const height = 36;
  state.page.drawRectangle({ x: M, y: state.y - height, width: W - M * 2, height, color: LIGHT, borderColor: LINE, borderWidth: 0.4 });
  text(state, account.consumerName || account.borrowerName || state.report?.customer?.name || "CONSUMER", M + 10, state.y - 12, 6.6, state.fonts.bold, BLUE);
  text(state, `Address - ${show(account.address || state.report?.customer?.address)}`, M + 10, state.y - 26, 5.2, state.fonts.regular, GREY);
  const tag = `v  ${label}`;
  const width = state.fonts.bold.widthOfTextAtSize(tag, 5.8);
  text(state, tag, W - M - width - 8, state.y - 14, 5.8, state.fonts.bold, GREEN);
  state.y -= height + 8;
}

function paymentHistory(state, rawHistory) {
  const history = list(rawHistory).slice(0, 48);
  ensure(state, Math.max(65, Math.ceil(history.length / 12) * 34 + 34));
  text(state, "Payment History", M, state.y, 5.8, state.fonts.bold, BLUE);
  state.y -= 12;
  if (!history.length) {
    text(state, "No payment history reported.", M, state.y, 5.5, state.fonts.regular, GREY);
    state.y -= 16;
    return;
  }
  const cell = (W - M * 2) / 13;
  const rows = Math.ceil(history.length / 12);
  for (let row = 0; row < rows; row += 1) {
    const top = state.y - row * 34;
    const year = historyYear(history[row * 12]);
    box(state, M, top - 32, cell, 32, LIGHT);
    centered(state, year, M, top - 19, cell, 5.2, state.fonts.bold, BLUE);
    for (let column = 0; column < 12; column += 1) {
      const entry = history[row * 12 + column];
      const x = M + cell * (column + 1);
      box(state, x, top - 32, cell, 32, WHITE);
      if (!entry) continue;
      const value = dpd(entry);
      const color = dpdColor(value);
      state.page.drawCircle({ x: x + cell / 2, y: top - 13, size: 7.2, color });
      centered(state, value, x, top - 15, cell, value.length > 3 ? 4.1 : 4.8, state.fonts.bold, WHITE);
      centered(state, historyMonth(entry), x, top - 28, cell, 4.5, state.fonts.regular, BLUE);
    }
  }
  state.y -= rows * 34 + 4;
}

function personalDetails(state, account) {
  ensure(state, 82);
  text(state, "Consumer Personal details on the Credit Account", M, state.y, 5.8, state.fonts.bold, BLUE);
  state.y -= 9;
  const customer = state.report?.customer || {};
  grid(state, [
    ["Date of Birth", date(account.dob || customer.dob)], ["Phone Type", account.phoneType], ["Phone Number", account.phone || customer.mobile], ["Extension", account.extension],
    ["ID Type", "PAN"], ["ID Number", maskPan(account.pan || customer.pan)], ["Date of Issue", date(account.idIssueDate)], ["Date of Expiry", date(account.idExpiryDate)],
    ["Gender", account.gender || customer.gender], ["Occupation", account.occupation], ["Email Address", account.email || customer.email], ["Passport", account.passport]
  ], 4);
}

function drawEnquiries(state) {
  const inquiries = list(state.report?.inquiries);
  ensure(state, 90);
  section(state, "CREDIT ENQUIRIES");
  noteLine(state, "This section shows the names of the credit institutions that have processed a credit / loan application for you.");
  if (!inquiries.length) {
    notice(state, "No credit enquiries were returned by the bureau.");
    return;
  }
  inquiries.forEach((inquiry, index) => {
    ensure(state, 95);
    consumerBar(state, inquiry, `Cr Enq. ${index + 1}`);
    grid(state, [
      ["Date of Birth", date(inquiry.dob || state.report?.customer?.dob)], ["PAN", maskPan(inquiry.pan || state.report?.customer?.pan)], ["ERN", inquiry.ern],
      ["Telephone", inquiry.telephone], ["Passport Number", inquiry.passport], ["Search Type", inquiry.searchType],
      ["Mobile Phone", inquiry.mobile || state.report?.customer?.mobile], ["Voter ID", inquiry.voterId], ["Credit Institution Name", inquiry.member || inquiry.lender || inquiry.name],
      ["Gender", inquiry.gender || state.report?.customer?.gender], ["Driving License", inquiry.drivingLicense], ["Application Date", date(inquiry.date || inquiry.enquiryDate)],
      ["Ration Card", inquiry.rationCard], ["Amount Applied For", money(inquiry.amount)], ["Duration of Agreement", inquiry.duration]
    ], 3);
  });
}

function drawClosing(state) {
  ensure(state, 290);
  section(state, "NON-CREDIT ENQUIRIES");
  noteLine(state, "This section shows non-credit enquiries such as authentication requests and requests for your Experian Credit Report & Credit Score by you.");
  state.y -= 16;
  section(state, "CONTACTING US");
  notice(state, "If you find a discrepancy in your report, it is important to notify the lender and raise a dispute through the Experian consumer services portal. Experian cannot correct information without authorization from your lender.");
  state.y -= 8;
  section(state, "LEGEND");
  [
    ["SFW/WO/SET/RES", "Credit Accounts that are Suit Filed, Wilful Default, Written Off, Settled or Restructured."],
    ["Active", "Credit accounts which are less than 90 days past due."],
    ["Active*", "Credit accounts which are over 90 days past due."],
    ["Closed", "Credit accounts that have a Date Closed populated."],
    ["DPD", "Days Past Due, the number of days payment is overdue."],
    ["STD / S", "Standard asset classification reported by the lender."],
    ["SMA / SUB / DBT / LSS", "Special Mention, Substandard, Doubtful and Loss asset classifications."],
    ["? / XXX", "Information not reported by the lender."]
  ].forEach(([code, description]) => {
    text(state, code, M + 12, state.y, 5.5, state.fonts.bold, BLUE);
    wrapped(state, description, M + 95, state.y, W - M * 2 - 105, 5.3, state.fonts.regular, BLUE, 2);
    state.y -= 15;
  });
  state.y -= 5;
  const end = "<---------------- END OF REPORT ---------------->";
  centered(state, end, M, state.y, W - M * 2, 6, state.fonts.bold, GREY);
  state.y -= 26;
  notice(state, "Experian Credit Information Company of India Private Limited is a registered Credit Information Company. This report reflects information provided by member institutions and should be used in accordance with applicable law and credit policy.");
}

function addPage(state) {
  state.page = state.pdf.addPage(PageSizes.A4);
  state.pageNumber += 1;
  header(state);
  footer(state);
  state.y = H - 66;
}

function header(state) {
  const x = M + 10;
  const y = H - 29;
  [[0, 12, PURPLE], [0, 5, MAGENTA], [7, 12, MAGENTA], [7, 5, PURPLE], [0, -2, PURPLE]].forEach(([dx, dy, color]) => {
    state.page.drawRectangle({ x: x + dx, y: y + dy, width: 5, height: 5, color });
  });
  text(state, "experian.", x + 18, y + 1, 17, state.fonts.regular, DARK_BLUE);
  const title = "Experian Credit Report";
  const titleWidth = state.fonts.bold.widthOfTextAtSize(title, 12.5);
  text(state, title, W - M - titleWidth, H - 24, 12.5, state.fonts.bold, BLUE);
  const report = state.report || {};
  const info = [
    `Report Date: ${compactDate(report.reportDate)}`,
    `Report Time: ${show(report.reportTime || reportTime(report.reportDate))}`,
    `Report Number: ${show(report.reportNumber || report.controlNumber)}`
  ];
  info.forEach((line, index) => {
    const width = state.fonts.regular.widthOfTextAtSize(line, 5.6);
    text(state, line, W - M - width, H - 37 - index * 7, 5.6, state.fonts.regular, BLUE);
  });
}

function footer(state) {
  state.page.drawLine({ start: { x: M, y: 20 }, end: { x: W - M, y: 20 }, thickness: 0.35, color: LINE });
  text(state, "Experian Credit Report", M, 10, 5, state.fonts.regular, GREY);
  const page = `Page ${state.pageNumber}`;
  text(state, page, W - M - state.fonts.regular.widthOfTextAtSize(page, 5), 10, 5, state.fonts.regular, GREY);
}

function section(state, title) {
  ensure(state, 24);
  state.page.drawRectangle({ x: M, y: state.y - 13, width: W - M * 2, height: 15, color: LIGHT });
  text(state, "v", M + 4, state.y - 4, 6.5, state.fonts.bold, GREEN);
  text(state, title, M + 13, state.y - 4, 7.6, state.fonts.serif, BLACK);
  state.y -= 21;
}

function grid(state, rows, columns) {
  const width = W - M * 2;
  const cellWidth = width / columns;
  const cellHeight = 24;
  const rowCount = Math.ceil(rows.length / columns);
  ensure(state, rowCount * cellHeight + 3);
  rows.forEach(([label, value], index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = M + column * cellWidth;
    const top = state.y - row * cellHeight;
    state.page.drawRectangle({ x, y: top - cellHeight, width: cellWidth, height: cellHeight, color: WHITE, borderColor: LINE, borderWidth: 0.3 });
    text(state, label, x + 4, top - 10, 4.8, state.fonts.bold, BLUE);
    wrapped(state, show(value), x + cellWidth * 0.47, top - 10, cellWidth * 0.5 - 4, 5.1, state.fonts.regular, BLACK, 2);
  });
  state.y -= rowCount * cellHeight;
}

function tableHeader(state, columns) {
  const width = W - M * 2;
  state.page.drawRectangle({ x: M, y: state.y - 23, width, height: 23, color: LIGHT });
  let x = M;
  columns.forEach(([label, ratio]) => {
    wrapped(state, label, x + 3, state.y - 8, width * ratio - 6, 4.5, state.fonts.bold, BLUE, 3);
    x += width * ratio;
  });
  state.y -= 23;
}

function tableRow(state, cells, ratios, height = 20) {
  ensure(state, height + 2);
  const width = W - M * 2;
  state.page.drawRectangle({ x: M, y: state.y - height, width, height, color: WHITE, borderColor: LINE, borderWidth: 0.3 });
  let x = M;
  cells.forEach((value, index) => {
    wrapped(state, show(value), x + 3, state.y - 8, width * ratios[index] - 6, 4.5, state.fonts.regular, BLACK, 2);
    x += width * ratios[index];
  });
  state.y -= height;
}

function meter(state, score, x, y, radius) {
  const colors = [RED, ORANGE, YELLOW, PALE_GREEN, GREEN];
  for (let index = 0; index <= 100; index += 1) {
    const angle = Math.PI - (Math.PI * index) / 100;
    const inner = radius - 24;
    state.page.drawLine({
      start: { x: x + Math.cos(angle) * inner, y: y + Math.sin(angle) * inner },
      end: { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius },
      thickness: 2,
      color: colors[Math.min(4, Math.floor(index / 20))]
    });
  }
  const normalized = Math.max(0, Math.min(1, (score - 300) / 600));
  const angle = Math.PI - Math.PI * normalized;
  state.page.drawLine({ start: { x, y }, end: { x: x + Math.cos(angle) * (radius - 12), y: y + Math.sin(angle) * (radius - 12) }, thickness: 1.6, color: DARK_BLUE });
  state.page.drawCircle({ x, y, size: 3, color: DARK_BLUE });
  centered(state, String(score), x - 35, y + 15, 70, 19, state.fonts.bold, BLACK);
  text(state, "300", x - radius - 5, y - 9, 4.5, state.fonts.regular, BLACK);
  text(state, "900", x + radius - 7, y - 9, 4.5, state.fonts.regular, BLACK);
}

function notice(state, value) {
  const lines = wrap(show(value), state.fonts.regular, 5.5, W - M * 2 - 14);
  const height = Math.max(30, lines.length * 8 + 14);
  ensure(state, height);
  state.page.drawRectangle({ x: M, y: state.y - height, width: W - M * 2, height, color: WHITE, borderColor: LINE, borderWidth: 0.35 });
  lines.forEach((line, index) => text(state, line, M + 7, state.y - 12 - index * 8, 5.5, state.fonts.regular, BLUE));
  state.y -= height;
}

function noteLine(state, value) {
  ensure(state, 20);
  wrapped(state, value, M + 4, state.y, W - M * 2 - 8, 5.2, state.fonts.regular, AMBER_TEXT, 2);
  state.y -= 15;
}

function box(state, x, y, width, height, color) {
  state.page.drawRectangle({ x, y, width, height, color, borderColor: LINE, borderWidth: 0.3 });
}

function centered(state, value, x, y, width, size, font, color) {
  const safe = ascii(value);
  const textWidth = font.widthOfTextAtSize(safe, size);
  text(state, safe, x + Math.max(0, (width - textWidth) / 2), y, size, font, color);
}

function wrapped(state, value, x, y, width, size, font, color, maxLines = 3) {
  wrap(show(value), font, size, width).slice(0, maxLines).forEach((line, index) => text(state, line, x, y - index * (size + 1.5), size, font, color));
}

function wrap(value, font, size, width) {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  if (!words.length) return ["-"];
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { if (line) lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  return lines;
}

function text(state, value, x, y, size, font, color) {
  state.page.drawText(ascii(value), { x, y, size, font, color });
}

function ensure(state, required) {
  if (state.y - required >= 28) return;
  addPage(state);
}

function ascii(value) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, " ").trim();
}

function show(value) {
  if (value === 0 || value === "0") return "0";
  return String(value ?? "").trim() || "-";
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function num(value) {
  if (value === null || value === undefined || value === "") return Number.NaN;
  const number = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : Number.NaN;
}

function sum(values) {
  return values.reduce((total, value) => { const number = num(value); return total + (Number.isFinite(number) ? number : 0); }, 0);
}

function money(value) {
  const number = num(value);
  return Number.isFinite(number) ? `Rs. ${number.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "-";
}

function plainNumber(value) {
  const number = num(value);
  return Number.isFinite(number) ? number.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "-";
}

function date(value) {
  if (!value) return "-";
  const raw = String(value).trim();
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(raw)) { const [day, month, year] = raw.split(/[-/]/); return `${year}-${month}-${day}`; }
  return raw.slice(0, 10) || "-";
}

function compactDate(value) {
  const normalized = date(value).replace(/-/g, "");
  return normalized === "" || normalized === "-" ? new Date().toISOString().slice(0, 10).replace(/-/g, "") : normalized;
}

function reportTime(value) {
  const parsed = new Date(value || Date.now());
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toTimeString().slice(0, 8).replace(/:/g, "");
}

function maskPan(value) {
  const raw = show(value);
  return raw.length >= 10 ? `${raw.slice(0, 2)}XXX${raw.slice(-5)}` : raw;
}

function maskAccount(value) {
  const raw = show(value);
  return raw.length > 4 ? `${"X".repeat(Math.min(14, raw.length - 4))}${raw.slice(-4)}` : raw;
}

function closed(account) {
  const status = String(account?.status || "").toLowerCase();
  return Boolean(account?.dateClosed) || status === "c" || status.includes("closed");
}

function isSecured(account) {
  const value = String(account?.secured || account?.securityStatus || account?.type || "").toLowerCase();
  return value.includes("secured") || value.includes("home") || value.includes("auto") || value.includes("gold");
}

function hasWrittenOffStatus(account) {
  const value = `${account?.status || ""} ${account?.writtenOffStatus || ""}`.toLowerCase();
  return ["written", "settled", "suit", "restructured"].some((word) => value.includes(word));
}

function countRecent(values, days) {
  const now = Date.now();
  return list(values).filter((item) => {
    const parsed = new Date(item?.date || item?.enquiryDate || item?.createdAt || "").getTime();
    return Number.isFinite(parsed) && now - parsed <= days * 86400000;
  }).length;
}

function dpd(entry) {
  const raw = entry?.dpd ?? entry?.daysPastDue ?? entry?.days_past_due;
  const number = num(raw);
  if (Number.isFinite(number)) return String(Math.max(0, Math.round(number)));
  const classification = String(entry?.assetClassification || entry?.asset_classification || entry?.classification || "").trim().toUpperCase();
  return classification || "?";
}

function dpdColor(value) {
  const number = num(value);
  if (Number.isFinite(number)) {
    if (number === 0) return GREEN;
    if (number < 30) return ORANGE;
    return RED;
  }
  return ["S", "STD", "STANDARD"].includes(String(value).toUpperCase()) ? GREEN : ORANGE;
}

function historyMonth(entry) {
  const month = String(entry?.month || entry?.monthName || "").trim();
  const dateValue = String(entry?.date || entry?.period || "").trim();
  return month ? month.slice(0, 3) : dateValue.slice(0, 3) || "-";
}

function historyYear(entry) {
  const year = String(entry?.year || "").trim();
  const dateValue = String(entry?.date || entry?.period || "").trim();
  const match = dateValue.match(/(19|20)\d{2}/);
  return year || match?.[0] || "-";
}
