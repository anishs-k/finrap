import { asyncHandler } from "../../utils/async-handler.js";
import { sendOk } from "../../utils/response.js";
import { buildUsageReport, buildUsageReportExcel } from "./report.service.js";

export const usageReport = asyncHandler(async (req, res) => {
  sendOk(res, await buildUsageReport(req.user, req.query));
});

export const exportUsageReport = asyncHandler(async (req, res) => {
  const excel = await buildUsageReportExcel(req.user, req.query);
  const fileName = `finrep-report-${new Date().toISOString().slice(0, 10)}.xls`;
  res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(`\ufeff${excel}`);
});
