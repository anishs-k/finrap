import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetsDirectory = path.join(moduleDirectory, "assets");

export const TU_TEMPLATE_PATH = path.join(assetsDirectory, "tu-static-template.pdf");
export const TU_LOGO_PATH = path.join(assetsDirectory, "transunion-cibil-logo.png");

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CYAN = rgb(0, 0.64, 0.79);
const GREY = rgb(0.42, 0.42, 0.42);
const LINE = rgb(0.82, 0.82, 0.82);

let templatePromise;

export async function ensureTuReportTemplate() {
  if (!templatePromise) {
    templatePromise = ensureTemplateFile();
  }
  return templatePromise;
}

async function ensureTemplateFile() {
  try {
    await fs.access(TU_TEMPLATE_PATH);
    return TU_TEMPLATE_PATH;
  } catch {
    await fs.mkdir(assetsDirectory, { recursive: true });
    const bytes = await createTuReportTemplate();
    await fs.writeFile(TU_TEMPLATE_PATH, bytes);
    return TU_TEMPLATE_PATH;
  }
}

export async function createTuReportTemplate() {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const logo = await document.embedPng(await fs.readFile(TU_LOGO_PATH));

  const firstPage = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  firstPage.drawImage(logo, {
    x: 28,
    y: 727,
    width: 290,
    height: (290 * logo.height) / logo.width
  });
  drawStaticFooter(firstPage, regular, bold);

  const continuationPage = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  continuationPage.drawText("TRANSUNION CIBIL REPORT", {
    x: 28,
    y: 812,
    size: 8,
    font: bold,
    color: CYAN
  });
  continuationPage.drawLine({
    start: { x: 28, y: 804 },
    end: { x: PAGE_WIDTH - 28, y: 804 },
    thickness: 0.6,
    color: LINE
  });
  drawStaticFooter(continuationPage, regular, bold);

  return document.save();
}

function drawStaticFooter(page, regular, bold) {
  page.drawLine({
    start: { x: 28, y: 25 },
    end: { x: PAGE_WIDTH - 28, y: 25 },
    thickness: 0.5,
    color: LINE
  });
  page.drawText("TransUnion CIBIL Consumer Credit Report", {
    x: 28,
    y: 13,
    size: 6.5,
    font: bold,
    color: GREY
  });
  page.drawText("Generated from authorized bureau data", {
    x: 202,
    y: 13,
    size: 6.5,
    font: regular,
    color: GREY
  });
}
