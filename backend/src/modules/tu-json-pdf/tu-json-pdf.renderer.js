import fs from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { TU_LOGO_PATH } from "./tu-json-pdf.template.js";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = 24;

const CYAN = rgb(0, 0.62, 0.75);
const YELLOW = rgb(1, 0.81, 0);
const BLACK = rgb(0.08, 0.09, 0.1);
const GREY = rgb(0.43, 0.45, 0.46);
const LIGHT_GREY = rgb(0.94, 0.94, 0.94);
const MID_GREY = rgb(0.88, 0.88, 0.88);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.82, 0.08, 0.08);

const DISCLAIMER =
  'All information contained in this credit report has been collated by TransUnion CIBIL Limited (TU CIBIL) based on information provided / submitted by its various members ("Members"), as part of periodic data submission and Members are required to ensure accuracy, completeness and veracity of the information submitted. The credit report is generated using the proprietary search and match logic of TU CIBIL. TU CIBIL uses its best efforts to ensure accuracy, completeness and veracity of the information contained in the Report, and shall only be liable and / or responsible if any discrepancies are directly attributable to TU CIBIL. The use of this report is governed by the terms and conditions of the Operating Rules for TU CIBIL and its Members.';

export async function renderTuReport(report) {
  const document = await PDFDocument.create();
  const fonts = {
    regular: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold)
  };
  const logo = await document.embedPng(await fs.readFile(TU_LOGO_PATH));
  const canvas = new ReportCanvas(document, fonts);

  canvas.newPage();
  canvas.drawLogo(logo);
  drawReportHeader(canvas, report);
  drawConsumerInformation(canvas, report);
  drawScore(canvas, report.score);
  drawPossibleRange(canvas);
  drawIdentifiers(canvas, report.identifiers);
  drawPhones(canvas, report.phones);
  drawEmails(canvas, report.emails);
  drawAddresses(canvas, report.addresses);
  drawEmployment(canvas, report.employers);
  drawAccountSummary(canvas, report.accountSummary);
  drawAccounts(canvas, report.accounts);
  drawInquirySummary(canvas, report.inquirySummary);
  drawInquiries(canvas, report.inquiries);
  drawDisclaimer(canvas);

  const bytes = await document.save();
  return { bytes: Buffer.from(bytes), pageCount: document.getPageCount() };
}

class ReportCanvas {
  constructor(document, fonts) {
    this.document = document;
    this.fonts = fonts;
    this.page = null;
    this.y = 0;
  }

  newPage() {
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - 20;
  }

  drawLogo(logo) {
    const width = 145;
    this.page.drawImage(logo, {
      x: MARGIN + 3,
      y: PAGE_HEIGHT - 61,
      width,
      height: (width * logo.height) / logo.width
    });
    this.y = PAGE_HEIGHT - 72;
  }

  ensure(height) {
    if (this.y - height < BOTTOM) {
      this.newPage();
      return true;
    }
    return false;
  }

  gap(height = 6) {
    this.y -= height;
  }

  section(title) {
    this.ensure(22);
    this.y -= 3;
    this.page.drawText(String(title).toUpperCase(), {
      x: MARGIN,
      y: this.y,
      size: 7.2,
      font: this.fonts.bold,
      color: CYAN
    });
    this.y -= 10;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.35,
      color: MID_GREY
    });
    this.y -= 7;
  }

  labelValue(label, value, x, width, options = {}) {
    const labelSize = options.labelSize || 5.3;
    const valueSize = options.valueSize || 6.5;
    this.page.drawText(String(label || "").toUpperCase(), {
      x,
      y: options.top,
      size: labelSize,
      font: this.fonts.bold,
      color: CYAN
    });
    const lines = wrapText(display(value), this.fonts.bold, valueSize, width);
    lines.slice(0, options.maxLines || 2).forEach((line, index) => {
      this.page.drawText(line, {
        x,
        y: options.top - 9 - index * (valueSize + 1.5),
        size: valueSize,
        font: this.fonts.bold,
        color: BLACK
      });
    });
  }

  table(columns, rows, options = {}) {
    const widths = normalizeWidths(columns.map((column) => column.width)).map((width) => width * CONTENT_WIDTH);
    const fontSize = options.fontSize || 6.2;
    const headerSize = options.headerSize || 5.2;
    const paddingX = options.paddingX ?? 4;
    const paddingY = options.paddingY ?? 4;
    const lineHeight = options.lineHeight || fontSize * 1.22;
    const headerHeight = options.headerHeight ?? 15;

    if (headerHeight) {
      this.ensure(headerHeight + 6);
      let x = MARGIN;
      columns.forEach((column, index) => {
        const lines = wrapText(String(column.label || "").toUpperCase(), this.fonts.bold, headerSize, widths[index] - paddingX * 2);
        lines.slice(0, 2).forEach((line, lineIndex) => {
          this.page.drawText(line, {
            x: x + paddingX,
            y: this.y - 7 - lineIndex * (headerSize + 1),
            size: headerSize,
            font: this.fonts.bold,
            color: CYAN
          });
        });
        x += widths[index];
      });
      this.y -= headerHeight;
    }

    rows.forEach((row, rowIndex) => {
      const cells = row.map((cell, index) =>
        wrapText(display(cell), options.boldValues ? this.fonts.bold : this.fonts.regular, fontSize, widths[index] - paddingX * 2)
      );
      const rowHeight = Math.max(
        options.minRowHeight || 17,
        ...cells.map((lines) => Math.min(lines.length, options.maxLines || 5) * lineHeight + paddingY * 2)
      );
      if (this.ensure(rowHeight + 2) && options.repeatHeader !== false && headerHeight) {
        let x = MARGIN;
        columns.forEach((column, index) => {
          this.page.drawText(String(column.label || "").toUpperCase(), {
            x: x + paddingX,
            y: this.y - 8,
            size: headerSize,
            font: this.fonts.bold,
            color: CYAN
          });
          x += widths[index];
        });
        this.y -= headerHeight;
      }
      if (options.striped !== false) {
        this.page.drawRectangle({
          x: MARGIN,
          y: this.y - rowHeight,
          width: CONTENT_WIDTH,
          height: rowHeight,
          color: rowIndex % 2 === 0 ? LIGHT_GREY : WHITE
        });
      }
      let x = MARGIN;
      cells.forEach((lines, index) => {
        lines.slice(0, options.maxLines || 5).forEach((line, lineIndex) => {
          this.page.drawText(line, {
            x: x + paddingX,
            y: this.y - paddingY - fontSize - lineIndex * lineHeight,
            size: fontSize,
            font: options.boldValues ? this.fonts.bold : this.fonts.regular,
            color: BLACK
          });
        });
        x += widths[index];
      });
      this.y -= rowHeight;
    });
  }

  paragraph(text, options = {}) {
    const size = options.size || 6;
    const lineHeight = options.lineHeight || size * 1.3;
    const width = options.width || CONTENT_WIDTH;
    const lines = wrapText(display(text), options.bold ? this.fonts.bold : this.fonts.regular, size, width);
    this.ensure(lines.length * lineHeight + 2);
    lines.forEach((line, index) => {
      this.page.drawText(line, {
        x: options.x || MARGIN,
        y: this.y - index * lineHeight,
        size,
        font: options.bold ? this.fonts.bold : this.fonts.regular,
        color: options.color || BLACK
      });
    });
    this.y -= lines.length * lineHeight;
  }
}

function drawReportHeader(canvas, report) {
  canvas.ensure(82);
  canvas.page.drawRectangle({
    x: MARGIN,
    y: canvas.y - 15,
    width: CONTENT_WIDTH,
    height: 15,
    color: YELLOW
  });
  canvas.page.drawText("CONSUMER CIR", {
    x: MARGIN + 5,
    y: canvas.y - 11,
    size: 6.2,
    font: canvas.fonts.bold,
    color: BLACK
  });
  canvas.y -= 25;

  const left = MARGIN + 3;
  const right = MARGIN + CONTENT_WIDTH * 0.68;
  const leftWidth = CONTENT_WIDTH * 0.6;
  const rightWidth = CONTENT_WIDTH * 0.29;
  const top = canvas.y;
  canvas.labelValue("Consumer", report.customer.name, left, leftWidth, { top });
  canvas.labelValue("Date", report.reportDate, right, rightWidth, { top });
  canvas.labelValue("Member ID", report.memberId, left, leftWidth, { top: top - 21 });
  canvas.labelValue("Time", report.reportTime, right, rightWidth, { top: top - 21 });
  canvas.labelValue("Member Reference Number", report.memberReference, left, leftWidth, { top: top - 42 });
  canvas.labelValue("Control Number", report.controlNumber, right, rightWidth, { top: top - 42 });
  canvas.y -= 62;
}

function drawConsumerInformation(canvas, report) {
  canvas.section("Consumer Information");
  canvas.ensure(35);
  const top = canvas.y;
  canvas.labelValue("Name", report.customer.name, MARGIN + 3, CONTENT_WIDTH * 0.55, { top });
  canvas.labelValue("Gender", report.customer.gender, MARGIN + CONTENT_WIDTH * 0.68, CONTENT_WIDTH * 0.28, { top });
  canvas.labelValue("Date of Birth", report.customer.dob, MARGIN + 3, CONTENT_WIDTH * 0.55, { top: top - 20 });
  canvas.y -= 39;
}

function drawScore(canvas, score = {}) {
  canvas.section("CIBIL TransUnion Score(s)");
  canvas.ensure(103);
  const meterWidth = CONTENT_WIDTH * 0.39;
  const detailsX = MARGIN + meterWidth + 18;
  canvas.page.drawText("SCORE NAME", {
    x: detailsX,
    y: canvas.y - 4,
    size: 5.2,
    font: canvas.fonts.bold,
    color: CYAN
  });
  canvas.page.drawText("SCORING FACTORS", {
    x: detailsX,
    y: canvas.y - 34,
    size: 5.2,
    font: canvas.fonts.bold,
    color: CYAN
  });

  const scoreValue = display(score.value);
  drawScoreMeter(canvas, scoreValue, {
    centerX: MARGIN + meterWidth / 2,
    centerY: canvas.y - 67,
    radius: 58
  });
  canvas.page.drawText(display(score.name), {
    x: detailsX,
    y: canvas.y - 17,
    size: 7,
    font: canvas.fonts.bold,
    color: BLACK
  });
  const factors = Array.isArray(score.factors) ? score.factors : [];
  if (factors.length) {
    const factorText = factors.map((factor) => factor.text || factor.code).filter(Boolean).join("; ");
    const lines = wrapText(factorText, canvas.fonts.regular, 5.5, CONTENT_WIDTH - meterWidth - 24);
    lines.slice(0, 7).forEach((line, index) => {
      canvas.page.drawText(line, {
        x: detailsX,
        y: canvas.y - 47 - index * 7,
        size: 5.5,
        font: canvas.fonts.regular,
        color: BLACK
      });
    });
  } else {
    canvas.page.drawText("No scoring factors were returned.", {
      x: detailsX,
      y: canvas.y - 47,
      size: 5.5,
      font: canvas.fonts.regular,
      color: GREY
    });
  }
  canvas.y -= 101;
}

function drawScoreMeter(canvas, scoreValue, { centerX, centerY, radius }) {
  const bands = [
    rgb(0.91, 0.25, 0.1),
    rgb(0.96, 0.48, 0.03),
    rgb(1, 0.77, 0),
    rgb(0.55, 0.75, 0.2),
    rgb(0, 0.58, 0.13)
  ];
  const segmentAngle = Math.PI / bands.length;
  const gap = 0.025;

  bands.forEach((color, index) => {
    const start = Math.PI - index * segmentAngle - gap;
    const end = Math.PI - (index + 1) * segmentAngle + gap;
    drawArc(canvas.page, centerX, centerY, radius, start, end, color, 7.5);
  });

  canvas.page.drawCircle({
    x: centerX,
    y: centerY,
    size: 17,
    color: LIGHT_GREY
  });

  const numericScore = Number(String(scoreValue).replace(/,/g, ""));
  const ratio = Number.isFinite(numericScore)
    ? Math.max(0, Math.min(1, (numericScore - 300) / 600))
    : 0;
  const needleAngle = Math.PI * (1 - ratio);
  canvas.page.drawLine({
    start: { x: centerX, y: centerY },
    end: {
      x: centerX + Math.cos(needleAngle) * (radius - 13),
      y: centerY + Math.sin(needleAngle) * (radius - 13)
    },
    thickness: 2.7,
    color: BLACK
  });
  canvas.page.drawCircle({
    x: centerX,
    y: centerY,
    size: 3.2,
    color: BLACK
  });

  canvas.page.drawText("300", {
    x: centerX - radius - 2,
    y: centerY - 13,
    size: 6.2,
    font: canvas.fonts.regular,
    color: GREY
  });
  canvas.page.drawText("900", {
    x: centerX + radius - 12,
    y: centerY - 13,
    size: 6.2,
    font: canvas.fonts.regular,
    color: GREY
  });

  const valueWidth = canvas.fonts.bold.widthOfTextAtSize(scoreValue, 14);
  canvas.page.drawText(scoreValue, {
    x: centerX - valueWidth / 2,
    y: centerY - 27,
    size: 14,
    font: canvas.fonts.bold,
    color: BLACK
  });
}

function drawArc(page, centerX, centerY, radius, startAngle, endAngle, color, thickness) {
  const steps = 18;
  let previous = {
    x: centerX + Math.cos(startAngle) * radius,
    y: centerY + Math.sin(startAngle) * radius
  };
  for (let index = 1; index <= steps; index += 1) {
    const angle = startAngle + ((endAngle - startAngle) * index) / steps;
    const current = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    };
    page.drawLine({
      start: previous,
      end: current,
      thickness,
      color
    });
    previous = current;
  }
}

function drawPossibleRange(canvas) {
  canvas.ensure(48);
  canvas.page.drawRectangle({
    x: MARGIN,
    y: canvas.y - 44,
    width: CONTENT_WIDTH,
    height: 44,
    color: LIGHT_GREY
  });
  canvas.page.drawText("POSSIBLE RANGE FOR CREDITVISION SCORE", {
    x: MARGIN + 5,
    y: canvas.y - 10,
    size: 5.6,
    font: canvas.fonts.bold,
    color: GREY
  });
  canvas.page.drawText("Consumer with at least one trade on the bureau in last 36 months", {
    x: MARGIN + 5,
    y: canvas.y - 23,
    size: 5.4,
    font: canvas.fonts.regular,
    color: BLACK
  });
  canvas.page.drawText(": 300 (high risk) to 900 (low risk)", {
    x: MARGIN + 368,
    y: canvas.y - 23,
    size: 5.4,
    font: canvas.fonts.regular,
    color: RED
  });
  canvas.page.drawText("Consumer not in CIBIL database or history older than 36 months", {
    x: MARGIN + 5,
    y: canvas.y - 32,
    size: 5.4,
    font: canvas.fonts.regular,
    color: BLACK
  });
  canvas.page.drawText(": -1", {
    x: MARGIN + 505,
    y: canvas.y - 32,
    size: 5.4,
    font: canvas.fonts.regular,
    color: RED
  });
  canvas.page.drawText("* At least one tradeline with information updated in last 36 months is required.", {
    x: MARGIN + 5,
    y: canvas.y - 40,
    size: 4.8,
    font: canvas.fonts.regular,
    color: GREY
  });
  canvas.y -= 51;
}

function drawIdentifiers(canvas, identifiers = []) {
  canvas.section("Identification(s)");
  canvas.table(
    [
      { label: "Identification Type", width: 0.37 },
      { label: "Identification Number", width: 0.3 },
      { label: "Issue Date", width: 0.165 },
      { label: "Expiration Date", width: 0.165 }
    ],
    identifiers.length
      ? identifiers.map((item) => [item.type, item.number, item.issueDate, item.expirationDate])
      : [["No identification data", "-", "-", "-"]]
  );
  canvas.gap(7);
}

function drawPhones(canvas, phones = []) {
  canvas.section("Telephone(s)");
  canvas.table(
    [
      { label: "Telephone Type", width: 0.43 },
      { label: "Telephone Number", width: 0.42 },
      { label: "Extension", width: 0.15 }
    ],
    phones.length ? phones.map((item) => [item.type, item.number, item.extension]) : [["-", "-", "-"]]
  );
  canvas.gap(7);
}

function drawEmails(canvas, emails = []) {
  canvas.section("Email Contact(s)");
  canvas.table([{ label: "Email Address", width: 1 }], emails.length ? emails.map((email) => [email]) : [["-"]]);
  canvas.gap(7);
}

function drawAddresses(canvas, addresses = []) {
  canvas.section("Address(es)");
  if (!addresses.length) {
    canvas.table([{ label: "Address", width: 1 }], [["No address information available"]]);
  } else {
    canvas.table(
      [
        { label: "Address", width: 0.56 },
        { label: "Category", width: 0.18 },
        { label: "Residence Code", width: 0.13 },
        { label: "Date Reported", width: 0.13 }
      ],
      addresses.map((address) => [
        address.address,
        address.category,
        address.residenceCode,
        address.dateReported
      ]),
      { fontSize: 5.8, minRowHeight: 20, maxLines: 4 }
    );
  }
  canvas.gap(7);
}

function drawEmployment(canvas, employers = []) {
  canvas.section("Employment Information");
  canvas.table(
    [
      { label: "Account Type", width: 0.24 },
      { label: "Date Reported", width: 0.18 },
      { label: "Occupation Code", width: 0.2 },
      { label: "Income", width: 0.15 },
      { label: "Net / Gross", width: 0.12 },
      { label: "Frequency", width: 0.11 }
    ],
    employers.length
      ? employers.map((item) => [
          item.accountType,
          item.dateReported,
          item.occupation,
          item.income,
          item.netGross,
          item.frequency
        ])
      : [["-", "-", "No employment information available", "-", "-", "-"]],
    { fontSize: 5.8 }
  );
  canvas.gap(7);
}

function drawAccountSummary(canvas, summary = {}) {
  canvas.section("Summary");
  canvas.page.drawText("ACCOUNT(S)", {
    x: MARGIN,
    y: canvas.y,
    size: 6.3,
    font: canvas.fonts.bold,
    color: CYAN
  });
  canvas.y -= 9;
  canvas.table(
    [
      { label: "Account Type", width: 0.16 },
      { label: "Accounts", width: 0.24 },
      { label: "Advances", width: 0.23 },
      { label: "Balances", width: 0.2 },
      { label: "Date Opened", width: 0.17 }
    ],
    [[
      "All Accounts",
      `Total: ${display(summary.total)}\nOverdue: ${display(summary.overdueAccounts)}\nZero Balance: ${display(summary.zeroBalance)}`,
      `High Cr/Sanc. Amt: ${formatMoney(summary.sanctionedAmount)}`,
      `Current: ${formatMoney(summary.currentBalance)}\nOverdue: ${formatMoney(summary.overdueAmount)}`,
      `Recent: ${display(summary.recentDate)}\nOldest: ${display(summary.oldestDate)}`
    ]],
    { fontSize: 5.6, minRowHeight: 35, maxLines: 4 }
  );
  canvas.gap(6);
}

function drawAccounts(canvas, accounts = []) {
  canvas.section("Account(s)");
  if (!accounts.length) {
    canvas.table([{ label: "Account", width: 1 }], [["No account information available"]]);
    return;
  }

  accounts.forEach((account) => drawAccount(canvas, account));
}

function drawAccount(canvas, account) {
  const history = Array.isArray(account.history) ? account.history.slice(0, 36) : [];
  const historySegments = chunk(history, 16);
  const historyHeight = historySegments.length ? 21 + historySegments.length * 28 : 0;
  const cardHeight = 100 + historyHeight;
  canvas.ensure(cardHeight + 8);

  const top = canvas.y;
  canvas.page.drawRectangle({
    x: MARGIN,
    y: top - cardHeight,
    width: CONTENT_WIDTH,
    height: cardHeight,
    color: LIGHT_GREY
  });

  const columns = [
    {
      x: MARGIN + 5,
      width: CONTENT_WIDTH * 0.24 - 8,
      rows: [
        ["Member Name", account.lender],
        ["Account Number", account.accountNumber],
        ["Type", account.type],
        ["Ownership", account.ownership],
        ["Amount Overdue", account.amountOverdue],
        ["Interest Rate", account.interestRate]
      ]
    },
    {
      x: MARGIN + CONTENT_WIDTH * 0.25,
      width: CONTENT_WIDTH * 0.24 - 8,
      rows: [
        ["Account Opened", account.dateOpened],
        ["Reported and Certified", account.dateReported],
        ["PMT Hist Start", account.historyFrom],
        ["PMT Hist End", account.historyTo],
        ["Last Payment", account.dateLastPayment],
        ["Collateral Type", account.collateralType]
      ]
    },
    {
      x: MARGIN + CONTENT_WIDTH * 0.5,
      width: CONTENT_WIDTH * 0.24 - 8,
      rows: [
        ["High Credit Amount", account.highCredit],
        ["Current Balance", account.currentBalance],
        ["EMI", account.emiAmount],
        ["Payment Frequency", account.paymentFrequency],
        ["Repayment Tenure", account.repaymentTenure],
        ["Collateral Value", account.collateralValue]
      ]
    },
    {
      x: MARGIN + CONTENT_WIDTH * 0.75,
      width: CONTENT_WIDTH * 0.24 - 8,
      valueStart: 0.72,
      rows: [
        ["Credit Facility Status", account.facilityStatus],
        ["Account Closed", account.dateClosed],
        ["Written-Off Amount (Principal)", account.writtenOffPrincipal],
        ["Written-Off Amount (Total)", account.writtenOffTotal],
        ["Settlement Amount", account.settlementAmount],
        ["Cash Limit", account.cashLimit]
      ]
    }
  ];

  columns.forEach((column) => {
    column.rows.forEach(([label, value], index) => {
      const y = top - 10 - index * 14;
      const labelText = String(label).toUpperCase();
      const valueStart = column.valueStart || 0.49;
      const labelMaxWidth = column.width * (valueStart - 0.04);
      const measuredLabelWidth = canvas.fonts.bold.widthOfTextAtSize(labelText, 4.4);
      const labelSize = measuredLabelWidth > labelMaxWidth
        ? Math.max(3.4, (labelMaxWidth / measuredLabelWidth) * 4.4)
        : 4.4;
      canvas.page.drawText(labelText, {
        x: column.x,
        y,
        size: labelSize,
        font: canvas.fonts.bold,
        color: GREY
      });
      const lines = wrapText(display(value), canvas.fonts.bold, 5.2, column.width * (1 - valueStart));
      canvas.page.drawText(lines[0] || "-", {
        x: column.x + column.width * valueStart,
        y,
        size: 5.2,
        font: canvas.fonts.bold,
        color: BLACK
      });
    });
  });

  if (historySegments.length) {
    const historyTop = top - 93;
    canvas.page.drawText("DAYS PAST DUE/ASSET CLASSIFICATION (UP TO 36 MONTHS; LEFT TO RIGHT)", {
      x: MARGIN + 5,
      y: historyTop,
      size: 4.8,
      font: canvas.fonts.bold,
      color: CYAN
    });
    historySegments.forEach((segment, segmentIndex) => {
      drawHistorySegment(canvas, segment, historyTop - 11 - segmentIndex * 28);
    });
  }

  canvas.y -= cardHeight + 7;
}

function drawHistorySegment(canvas, segment, top) {
  const cellWidth = (CONTENT_WIDTH - 10) / 16;
  segment.forEach((item, index) => {
    const x = MARGIN + 5 + index * cellWidth;
    canvas.page.drawText(display(item.status), {
      x,
      y: top,
      size: 5.1,
      font: canvas.fonts.bold,
      color: BLACK
    });
    canvas.page.drawText(display(item.month), {
      x,
      y: top - 11,
      size: 4.7,
      font: canvas.fonts.regular,
      color: GREY
    });
  });
}

function drawInquirySummary(canvas, summary = {}) {
  canvas.section("Enquiries Summary");
  canvas.table(
    [
      { label: "Enquiry Purpose", width: 0.3 },
      { label: "Total", width: 0.12 },
      { label: "Past 30 Days", width: 0.16 },
      { label: "Past 12 Months", width: 0.16 },
      { label: "Past 24 Months", width: 0.16 },
      { label: "Recent", width: 0.1 }
    ],
    [[
      "All Enquiries",
      summary.total,
      summary.past30Days,
      summary.past12Months,
      summary.past24Months,
      summary.recentDate
    ]]
  );
  canvas.gap(7);
}

function drawInquiries(canvas, inquiries = []) {
  canvas.section("Enquiries");
  canvas.table(
    [
      { label: "Member", width: 0.36 },
      { label: "Enquiry Date", width: 0.2 },
      { label: "Enquiry Purpose", width: 0.26 },
      { label: "Enquiry Amount", width: 0.18 }
    ],
    inquiries.length
      ? inquiries.map((item) => [item.member, item.date, item.purpose, item.amount])
      : [["No enquiries available", "-", "-", "-"]],
    { fontSize: 5.8, minRowHeight: 16, maxLines: 3 }
  );
  canvas.gap(8);
}

function drawDisclaimer(canvas) {
  canvas.ensure(62);
  canvas.paragraph(DISCLAIMER, {
    size: 4.8,
    lineHeight: 5.9,
    color: GREY
  });
  canvas.gap(8);
  const copyright =
    "(c) 2026 TransUnion CIBIL Limited. (Formerly: Credit Information Bureau (India) Limited). All rights reserved";
  const copyrightWidth = canvas.fonts.bold.widthOfTextAtSize(copyright, 4.8);
  canvas.page.drawText(copyright, {
    x: (PAGE_WIDTH - copyrightWidth) / 2,
    y: canvas.y,
    size: 4.8,
    font: canvas.fonts.bold,
    color: GREY
  });
  canvas.y -= 7;
  const cin = "TransUnion CIBIL CIN : U72300MH2000PLC128359";
  canvas.page.drawText(cin, {
    x: (PAGE_WIDTH - canvas.fonts.bold.widthOfTextAtSize(cin, 4.8)) / 2,
    y: canvas.y,
    size: 4.8,
    font: canvas.fonts.bold,
    color: GREY
  });
}

function display(value) {
  if (value === null || value === undefined || value === "") return "---";
  return String(value);
}

function formatMoney(value) {
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? number.toLocaleString("en-IN") : display(value);
}

function normalizeWidths(widths) {
  const total = widths.reduce((sum, width) => sum + Number(width || 0), 0) || 1;
  return widths.map((width) => Number(width || 0) / total);
}

function chunk(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function wrapText(text, font, size, maxWidth) {
  const lines = [];
  String(text || "---")
    .replace(/\r/g, "")
    .split("\n")
    .forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push("");
        return;
      }
      let line = "";
      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          line = candidate;
          return;
        }
        if (line) lines.push(line);
        if (font.widthOfTextAtSize(word, size) <= maxWidth) {
          line = word;
          return;
        }
        let fragment = "";
        [...word].forEach((character) => {
          const candidateFragment = `${fragment}${character}`;
          if (fragment && font.widthOfTextAtSize(candidateFragment, size) > maxWidth) {
            lines.push(fragment);
            fragment = character;
          } else {
            fragment = candidateFragment;
          }
        });
        line = fragment;
      });
      if (line) lines.push(line);
    });
  return lines.length ? lines : ["---"];
}
