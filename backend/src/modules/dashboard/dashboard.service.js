import { ROLES } from "../../constants/roles.js";
import { visibleUserFilter } from "../../utils/permissions.js";
import { SystemSetting } from "../system/system-setting.model.js";
import { User } from "../users/user.model.js";
import { Verification } from "../verification/verification.model.js";
import { WalletTransaction } from "../wallet/wallet-transaction.model.js";

const DASHBOARD_TIMEZONE = "Asia/Kolkata";
const DASHBOARD_TIMEZONE_OFFSET_MINUTES = 330;
const monthLabelFormatter = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const DASHBOARD_REPORT_SERVICES = ["CIBIL", "CIBIL_JSON", "EQUIFAX", "EQUIFAX_JSON", "CRIF", "CRIF_JSON"];
const PUBLIC_DASHBOARD_REPORT_REFERENCE = /^public-api:(tu-cibil-pdf|tu-cibil-json|equifax-cibil-pdf|equifax-cibil-json|crif-pdf|crif-json):/;
const TU_JSON_PDF_COUNTER_RESET_KEY = "tu_json_pdf_counter_reset_at";

export async function getDashboardForUser(user) {
  const userFilter = visibleUserFilter(user);
  const visibleActors = user.role === ROLES.SUPER_ADMIN
    ? []
    : await User.find(userFilter).select("_id");
  const visibleActorIds = visibleActors.map((account) => account._id);
  const verificationFilter = user.role === ROLES.SUPER_ADMIN ? {} : { actor: { $in: visibleActors.map((account) => account._id) } };
  const reportFilter = { ...verificationFilter, service: { $in: DASHBOARD_REPORT_SERVICES }, status: "verified" };

  const [teamSize, verifications, reports, trendData, tuJsonPdfReports, experianJsonPdfReports] = await Promise.all([
    User.countDocuments({ $and: [userFilter, { _id: { $ne: user._id } }] }),
    Verification.countDocuments(verificationFilter),
    countGeneratedReports(reportFilter, user.role === ROLES.SUPER_ADMIN ? null : visibleActorIds),
    buildGeneratedReportTrend(reportFilter, user.role === ROLES.SUPER_ADMIN ? null : visibleActorIds),
    user.role === ROLES.SUPER_ADMIN ? countTuJsonPdfReports() : Promise.resolve(0),
    user.role === ROLES.SUPER_ADMIN ? countExperianJsonPdfReports() : Promise.resolve(0)
  ]);

  return {
    teamSize,
    verifications,
    reports,
    ...(user.role === ROLES.SUPER_ADMIN ? { tuJsonPdfReports, experianJsonPdfReports } : {}),
    trend: trendData.values,
    trendLabels: trendData.labels,
    trendPeriod: trendData.periodLabel
  };
}

async function countTuJsonPdfReports() {
  const resetSetting = await SystemSetting.findOne({ key: TU_JSON_PDF_COUNTER_RESET_KEY }).lean();
  const resetAt = resetSetting?.value ? new Date(resetSetting.value) : null;
  return countRetainedJsonPdfCharges({
    service: "CIBIL",
    createdAt: resetAt && !Number.isNaN(resetAt.getTime()) ? { $gt: resetAt } : null,
    verificationMatch: {
      "details.providerResponse.provider": { $ne: "Verifyal" },
      $or: [
        { "details.providerResponse.provider": "AO Pay" },
        { "details.providerType": "aopay-tu-json-pdf" },
        { "details.providerAttempts": { $elemMatch: { provider: "AO Pay" } } },
        {
          "details.providerResponse.providerAttempts": {
            $elemMatch: { provider: "AO Pay" }
          }
        }
      ]
    }
  });
}

async function countExperianJsonPdfReports() {
  return countRetainedJsonPdfCharges({
    service: "EXPERIAN_PDF"
  });
}

async function countRetainedJsonPdfCharges({ service, createdAt = null, verificationMatch = {} }) {
  const transactionMatch = {
    type: "debit",
    source: "api_usage"
  };

  if (createdAt) {
    transactionMatch.createdAt = createdAt;
  }

  const grouped = await WalletTransaction.aggregate([
    { $match: transactionMatch },
    {
      $lookup: {
        from: WalletTransaction.collection.name,
        let: {
          userId: "$user",
          refundReference: { $concat: ["$reference", ":refund"] }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user", "$$userId"] },
                  { $eq: ["$type", "credit"] },
                  { $eq: ["$source", "system"] },
                  { $eq: ["$reference", "$$refundReference"] }
                ]
              }
            }
          },
          { $limit: 1 }
        ],
        as: "refunds"
      }
    },
    { $match: { refunds: { $size: 0 } } },
    {
      $lookup: {
        from: Verification.collection.name,
        let: {
          actorId: "$user",
          billingReference: "$reference"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$actor", "$$actorId"] },
                  {
                    $or: [
                      { $eq: ["$details.billingReference", "$$billingReference"] },
                      { $eq: ["$providerReference", "$$billingReference"] }
                    ]
                  }
                ]
              }
            }
          },
          { $match: { service, ...verificationMatch } },
          { $limit: 1 }
        ],
        as: "matchingVerifications"
      }
    },
    { $match: { "matchingVerifications.0": { $exists: true } } },
    { $count: "count" }
  ]);

  return grouped[0]?.count || 0;
}

async function countGeneratedReports(reportFilter, visibleActorIds) {
  const [verifiedReports, missingPublicApiLogs] = await Promise.all([
    Verification.countDocuments(reportFilter),
    countBillablePublicApiDebitsWithoutVerification({ visibleActorIds })
  ]);

  return verifiedReports + missingPublicApiLogs;
}

async function buildGeneratedReportTrend(reportFilter, visibleActorIds) {
  const [verificationTrend, missingPublicApiTrend] = await Promise.all([
    buildVerificationTrend(reportFilter),
    buildBillablePublicApiDebitTrend({ visibleActorIds })
  ]);

  const publicApiCounts = new Map(missingPublicApiTrend.map((item) => [item.key, item.count]));

  return {
    values: verificationTrend.values.map((value, index) => {
      const key = verificationTrend.keys[index];
      return value + (publicApiCounts.get(key) || 0);
    }),
    labels: verificationTrend.labels,
    periodLabel: verificationTrend.periodLabel
  };
}

async function buildVerificationTrend(baseFilter) {
  const months = rollingTwelveMonthWindowInBusinessTimezone();
  const start = startOfBusinessMonthUtc(months[0].year, months[0].month);
  const grouped = await Verification.aggregate([
    { $match: { ...baseFilter, createdAt: { $gte: start } } },
    {
      $group: {
        _id: {
          year: { $year: { date: "$createdAt", timezone: DASHBOARD_TIMEZONE } },
          month: { $month: { date: "$createdAt", timezone: DASHBOARD_TIMEZONE } }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const counts = new Map(
    grouped.map((item) => [`${item._id.year}-${String(item._id.month).padStart(2, "0")}`, item.count])
  );

  return {
    keys: months.map((month) => month.key),
    values: months.map((month) => counts.get(month.key) || 0),
    labels: months.map((month) => month.label),
    periodLabel: String(zonedYearMonth().year)
  };
}

async function countBillablePublicApiDebitsWithoutVerification({ visibleActorIds = null, createdAt = null } = {}) {
  const grouped = await WalletTransaction.aggregate([
    ...billablePublicApiDebitsWithoutVerificationPipeline({ visibleActorIds, createdAt }),
    { $count: "count" }
  ]);

  return grouped[0]?.count || 0;
}

async function buildBillablePublicApiDebitTrend({ visibleActorIds = null } = {}) {
  const months = rollingTwelveMonthWindowInBusinessTimezone();
  const start = startOfBusinessMonthUtc(months[0].year, months[0].month);
  const grouped = await WalletTransaction.aggregate([
    ...billablePublicApiDebitsWithoutVerificationPipeline({ visibleActorIds, createdAt: { $gte: start } }),
    {
      $group: {
        _id: {
          year: { $year: { date: "$createdAt", timezone: DASHBOARD_TIMEZONE } },
          month: { $month: { date: "$createdAt", timezone: DASHBOARD_TIMEZONE } }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const counts = new Map(
    grouped.map((item) => [`${item._id.year}-${String(item._id.month).padStart(2, "0")}`, item.count])
  );

  return months.map((month) => ({
    key: month.key,
    count: counts.get(month.key) || 0
  }));
}

function billablePublicApiDebitsWithoutVerificationPipeline({ visibleActorIds = null, createdAt = null } = {}) {
  const match = {
    type: "debit",
    source: "api_usage",
    reference: PUBLIC_DASHBOARD_REPORT_REFERENCE
  };

  if (Array.isArray(visibleActorIds)) {
    match.user = { $in: visibleActorIds };
  }

  if (createdAt) {
    match.createdAt = createdAt;
  }

  return [
    { $match: match },
    {
      $lookup: {
        from: WalletTransaction.collection.name,
        let: {
          userId: "$user",
          refundReference: { $concat: ["$reference", ":refund"] }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user", "$$userId"] },
                  { $eq: ["$type", "credit"] },
                  { $eq: ["$source", "system"] },
                  { $eq: ["$reference", "$$refundReference"] }
                ]
              }
            }
          }
        ],
        as: "refunds"
      }
    },
    { $match: { refunds: { $size: 0 } } },
    {
      $lookup: {
        from: Verification.collection.name,
        let: {
          actorId: "$user",
          billingReference: "$reference"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$actor", "$$actorId"] },
                  { $eq: ["$details.billingReference", "$$billingReference"] }
                ]
              }
            }
          }
        ],
        as: "verificationLogs"
      }
    },
    { $match: { verificationLogs: { $size: 0 } } }
  ];
}

function rollingTwelveMonthWindowInBusinessTimezone(now = new Date()) {
  const { year, month } = zonedYearMonth(now);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (11 - index), 1));
    const itemYear = date.getUTCFullYear();
    const itemMonth = date.getUTCMonth() + 1;
    return {
      year: itemYear,
      month: itemMonth,
      key: `${itemYear}-${String(itemMonth).padStart(2, "0")}`,
      label: monthLabelFormatter.format(date)
    };
  });
}

function zonedYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIMEZONE,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value)
  };
}

function startOfBusinessMonthUtc(year, month) {
  return new Date(Date.UTC(year, month - 1, 1) - DASHBOARD_TIMEZONE_OFFSET_MINUTES * 60 * 1000);
}
