import { Fragment, type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  Ban,
  Bell,
  Camera,
  FileSpreadsheet,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck2,
  FileDown,
  Fingerprint,
  Gauge,
  Hourglass,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Save,
  ScrollText,
  Search,
  MessageCircle,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  WalletCards,
  X,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { searchItems, type SearchItem } from "./utils/search";
import {
  api,
  clearStoredSession,
  readStoredSession,
  writeStoredSession,
  type ActivityItem,
  type ApiPricing,
  type ApiPricingPayload,
  type BillingInvoice,
  type BillingSettings,
  type DashboardMetrics,
  type Invite,
  type Plan,
  type Role,
  type UserAccount,
  type VerificationResult,
  type NotificationItem,
  type UsageReportPayload,
  type UsageReportRecord,
  type WalletRate,
  type WalletSummary,
  type AlertItem
} from "./api/client";
import { privacyDocument, termsDocument, type LegalDocument } from "./legalContent";
import { TuJsonPdfView } from "./components/TuJsonPdfView";

type Language = "en" | "hi";
type View =
  | "dashboard"
  | "users"
  | "contact"
  | "alerts"
  | "reports"
  | "apiDocs"
  | "apiServices"
  | "apiServicesBureau"
  | "apiServicesVerification"
  | "apiServicesIncome"
  | "apiServicesEsign"
  | "plans"
  | "wallet"
  | "billing"
  | "apiPricing"
  | "tools"
  | "cibil"
  | "cibil-json"
  | "tu-json-to-pdf"
  | "equifax-cibil"
  | "equifax-cibil-json"
  | "crif"
  | "crif-json"
  | "aadhaar"
  | "aadhaar-validation"
  | "aadhaar-otp"
  | "esign"
  | "econsent"
  | "pan"
  | "uan-fetch-by-pan"
  | "uan-profile-details"
  | "employment-history"
  | "epfo-passbook"
  | "gstin-verification"
  | "bank-verification"
  | "driving-license"
  | "rc-basic"
  | "experian-json"
  | "experian-pdf"
  | "face-match"
  | "mca-company"
  | "prefill"
  | "activity"
  | "profile";
type ServiceKind =
  | "pan"
  | "aadhaar-validation"
  | "aadhaar-otp"
  | "uan-fetch-by-pan"
  | "uan-profile-details"
  | "employment-history"
  | "epfo-passbook"
  | "gstin-verification"
  | "bank-verification"
  | "driving-license"
  | "rc-basic"
  | "experian-json"
  | "experian-pdf"
  | "face-match"
  | "mca-company"
  | "prefill"
  | "aadhaar"
  | "esign"
  | "econsent"
  | "cibil"
  | "cibil-json"
  | "tu-json-to-pdf"
  | "equifax-cibil"
  | "equifax-cibil-json"
  | "crif"
  | "crif-json";

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: "_modal" | "_self" | "_blank" | "_top" }) => Promise<{
        error?: { message?: string };
        redirect?: boolean;
        paymentDetails?: unknown;
      }>;
    };
  }
}
type PermissionId =
  | "dashboard.view"
  | "users.view"
  | "users.invite"
  | "wallet.view"
  | "wallet.recharge"
  | "roles.view"
  | "roles.assign"
  | "cibil.view"
  | "cibil.generate"
  | "cibilJson.view"
  | "cibilJson.generate"
  | "equifaxCibil.view"
  | "equifaxCibil.generate"
  | "equifaxCibilJson.view"
  | "equifaxCibilJson.generate"
  | "crif.view"
  | "crif.generate"
  | "crifJson.view"
  | "crifJson.generate"
  | "pan.view"
  | "pan.generate"
  | "aadhaarValidation.view"
  | "aadhaarValidation.generate"
  | "aadhaarOtp.view"
  | "aadhaarOtp.generate"
  | "uanFetchByPan.view"
  | "uanFetchByPan.generate"
  | "uanProfileDetails.view"
  | "uanProfileDetails.generate"
  | "employmentHistory.view"
  | "employmentHistory.generate"
  | "epfoPassbook.view"
  | "epfoPassbook.generate"
  | "gstin.view"
  | "gstin.generate"
  | "bankVerification.view"
  | "bankVerification.generate"
  | "drivingLicense.view"
  | "drivingLicense.generate"
  | "rcBasic.view"
  | "rcBasic.generate"
  | "experianJson.view"
  | "experianJson.generate"
  | "experianPdf.view"
  | "experianPdf.generate"
  | "faceMatch.view"
  | "faceMatch.generate"
  | "mcaCompany.view"
  | "mcaCompany.generate"
  | "prefill.view"
  | "prefill.generate"
  | "api.tuCibilPdf"
  | "api.tuCibilJson"
  | "api.equifaxCibilPdf"
  | "api.equifaxCibilJson"
  | "api.crifPdf"
  | "api.crifJson"
  | "api.panFullDetail"
  | "api.aadhaarValidation"
  | "api.aadhaarOtp"
  | "api.uanFetchByPan"
  | "api.uanProfileDetails"
  | "api.employmentHistory"
  | "api.epfoPassbook"
  | "api.gstinVerification"
  | "api.bankVerification"
  | "api.drivingLicense"
  | "api.rcBasic"
  | "api.experianJson"
  | "api.experianPdf"
  | "api.faceMatch"
  | "api.mcaCompany"
  | "api.prefill"
  | "esign.view"
  | "esign.generate"
  | "econsent.view"
  | "econsent.generate"
  | "api.esign"
  | "api.econsent"
  | "activity.view";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_SYNC_MS = 5 * 60 * 1000;
const VIEW_STORAGE_KEY = "dhaara-active-view";
const TERMS_PRIVACY_URL = "/terms";
const PRIVACY_POLICY_URL = "/privacy";
const AGENT_AGREEMENT_URL = "/agent-agreement";
const COMPANY_LEGAL_INFO =
  "Company Name: Finrep. Registered Office: Sai Krupa Soc, B Wing, R No 606, Behind Giri Hotel, Mumbai, Maharashtra, India, PIN 400084. Contact Email: info@thefinrep.com.";
const QUICK_RECHARGE_AMOUNTS = [500, 1000, 2000, 5000];
const ROLE_MINIMUM_RECHARGE: Partial<Record<Role, number>> = {
  agent: 25000,
  sub_agent: 15000,
  user: 10000
};
const KYC_REVIEW_STATUSES = new Set(["pending_admin"]);
const inviteMatrix: Record<Role, Role[]> = {
  super_admin: ["agent", "sub_agent", "user"],
  agent: ["sub_agent", "user"],
  sub_agent: ["user"],
  user: []
};

const roleLabels: Record<Language, Record<Role, string>> = {
  en: {
    super_admin: "Super Admin",
    agent: "Agent",
    sub_agent: "Sub Agent",
    user: "User"
  },
  hi: {
    super_admin: "???? ?????",
    agent: "?????",
    sub_agent: "?? ?????",
    user: "????"
  }
};

const permissionGroups: Array<{
  group: string;
  icon: LucideIcon;
  permissions: PermissionId[];
}> = [
  { group: "Workspace", icon: LayoutDashboard, permissions: ["dashboard.view", "activity.view"] },
  { group: "Team", icon: Users, permissions: ["users.view", "users.invite"] },
  { group: "Wallet", icon: IndianRupee, permissions: ["wallet.view", "wallet.recharge"] },
  { group: "Role", icon: ShieldCheck, permissions: ["roles.view", "roles.assign"] },
  {
    group: "Credit Reports",
    icon: Gauge,
    permissions: [
      "cibil.view",
      "cibil.generate",
      "cibilJson.view",
      "cibilJson.generate",
      "equifaxCibil.view",
      "equifaxCibil.generate",
      "equifaxCibilJson.view",
      "equifaxCibilJson.generate",
      "crif.view",
      "crif.generate",
      "crifJson.view",
      "crifJson.generate",
      "experianJson.view",
      "experianJson.generate",
      "experianPdf.view",
      "experianPdf.generate",
      "prefill.view",
      "prefill.generate"
    ]
  },
  {
    group: "Verification",
    icon: CreditCard,
    permissions: [
      "pan.view",
      "pan.generate",
      "aadhaarValidation.view",
      "aadhaarValidation.generate",
      "aadhaarOtp.view",
      "aadhaarOtp.generate",
      "uanFetchByPan.view",
      "uanFetchByPan.generate",
      "uanProfileDetails.view",
      "uanProfileDetails.generate",
      "employmentHistory.view",
      "employmentHistory.generate",
      "epfoPassbook.view",
      "epfoPassbook.generate",
      "drivingLicense.view",
      "drivingLicense.generate",
      "rcBasic.view",
      "rcBasic.generate",
      "faceMatch.view",
      "faceMatch.generate",
      "mcaCompany.view",
      "mcaCompany.generate"
    ]
  },
  {
    group: "Income",
    icon: Landmark,
    permissions: ["gstin.view", "gstin.generate", "bankVerification.view", "bankVerification.generate"]
  },
  {
    group: "eSign",
    icon: FileCheck2,
    permissions: ["esign.view", "esign.generate", "econsent.view", "econsent.generate"]
  },
  {
    group: "API",
    icon: FileSpreadsheet,
    permissions: [
      "api.tuCibilPdf",
      "api.tuCibilJson",
      "api.equifaxCibilPdf",
      "api.equifaxCibilJson",
      "api.crifPdf",
      "api.crifJson",
      "api.panFullDetail",
      "api.aadhaarValidation",
      "api.aadhaarOtp",
      "api.uanFetchByPan",
      "api.uanProfileDetails",
      "api.employmentHistory",
      "api.epfoPassbook",
      "api.gstinVerification",
      "api.bankVerification",
      "api.drivingLicense",
      "api.rcBasic",
      "api.experianJson",
      "api.experianPdf",
      "api.faceMatch",
      "api.mcaCompany",
      "api.prefill",
      "api.esign",
      "api.econsent"
    ]
  }
];
const allAssignablePermissions = permissionGroups.flatMap((group) => group.permissions);

const permissionText: Record<Language, Record<PermissionId, { title: string; detail: string }>> = {
  en: {
    "dashboard.view": { title: "View Dashboard", detail: "See Overview Metrics and Trend Data." },
    "users.view": { title: "View Users", detail: "See Invited and Active Accounts." },
    "users.invite": { title: "Invite Users", detail: "Invite the Next Allowed Account Roles." },
    "wallet.view": { title: "View Wallet", detail: "See Wallet Balance and Wallet Ledger." },
    "wallet.recharge": { title: "Recharge Wallet", detail: "Add rupees through Cashfree recharge." },
    "roles.view": { title: "View Roles", detail: "See Assigned Role and Permission Details." },
    "roles.assign": { title: "Assign Roles", detail: "Choose Allowed Roles while Inviting Accounts." },
    "cibil.view": { title: "View TU CIBIL PDF", detail: "Open TU CIBIL PDF report screens and history." },
    "cibil.generate": { title: "Generate TU CIBIL PDF", detail: "Submit new TU CIBIL PDF report requests." },
    "cibilJson.view": { title: "View TU CIBIL JSON", detail: "Open TU CIBIL JSON report screens and history." },
    "cibilJson.generate": { title: "Generate TU CIBIL JSON", detail: "Submit new TU CIBIL JSON report requests." },
    "equifaxCibil.view": { title: "View Equifax CIBIL PDF", detail: "Open Equifax CIBIL PDF report screens and history." },
    "equifaxCibil.generate": { title: "Generate Equifax CIBIL PDF", detail: "Submit new Equifax CIBIL PDF report requests." },
    "equifaxCibilJson.view": { title: "View Equifax CIBIL JSON", detail: "Open Equifax CIBIL JSON report screens and history." },
    "equifaxCibilJson.generate": { title: "Generate Equifax CIBIL JSON", detail: "Submit new Equifax CIBIL JSON report requests." },
    "crif.view": { title: "View CRIF PDF", detail: "Open CRIF PDF report screens and history." },
    "crif.generate": { title: "Generate CRIF PDF", detail: "Submit new CRIF PDF report requests." },
    "crifJson.view": { title: "View CRIF JSON", detail: "Open CRIF JSON report screens and history." },
    "crifJson.generate": { title: "Generate CRIF JSON", detail: "Submit new CRIF JSON report requests." },
    "pan.view": { title: "View PAN Verification", detail: "Open PAN full-detail verification screens and history." },
    "pan.generate": { title: "Generate PAN Verification", detail: "Submit PAN full-detail verification requests." },
    "aadhaarValidation.view": { title: "View Aadhaar Validation", detail: "Open Aadhaar validation screens and history." },
    "aadhaarValidation.generate": { title: "Generate Aadhaar Validation", detail: "Submit Aadhaar validation requests." },
    "aadhaarOtp.view": { title: "View Aadhaar OTP", detail: "Open Aadhaar OTP verification screens and history." },
    "aadhaarOtp.generate": { title: "Generate Aadhaar OTP", detail: "Generate and verify Aadhaar OTP requests." },
    "uanFetchByPan.view": { title: "View UAN by PAN", detail: "Open UAN fetch by PAN screens and history." },
    "uanFetchByPan.generate": { title: "Fetch UAN by PAN", detail: "Submit UAN lookup requests using PAN." },
    "uanProfileDetails.view": { title: "View UAN Profile Details", detail: "Open UAN profile detail screens and history." },
    "uanProfileDetails.generate": { title: "Fetch UAN Profile Details", detail: "Submit UAN profile detail requests." },
    "employmentHistory.view": { title: "View Employment History", detail: "Open employment history screens and history." },
    "employmentHistory.generate": { title: "Fetch Employment History", detail: "Submit employment history requests by UAN." },
    "epfoPassbook.view": { title: "View EPFO Passbook", detail: "Open EPFO passbook screens and history." },
    "epfoPassbook.generate": { title: "Fetch EPFO Passbook", detail: "Submit EPFO passbook requests using mobile and PAN." },
    "gstin.view": { title: "View GSTIN Verification", detail: "Open GSTIN verification screens and history." },
    "gstin.generate": { title: "Generate GSTIN Verification", detail: "Submit GSTIN verification requests." },
    "bankVerification.view": { title: "View Bank Verification", detail: "Open bank verification screens and history." },
    "bankVerification.generate": { title: "Generate Bank Verification", detail: "Submit bank account verification requests." },
    "drivingLicense.view": { title: "View Driving License", detail: "Open driving license verification screens and history." },
    "drivingLicense.generate": { title: "Generate Driving License", detail: "Submit driving license verification requests." },
    "rcBasic.view": { title: "View Basic RC", detail: "Open Basic RC verification screens and history." },
    "rcBasic.generate": { title: "Generate Basic RC", detail: "Submit Basic RC verification requests." },
    "experianJson.view": { title: "View Experian JSON", detail: "Open Experian JSON report screens and history." },
    "experianJson.generate": { title: "Generate Experian JSON", detail: "Submit Experian JSON report requests." },
    "experianPdf.view": { title: "View Experian PDF", detail: "Open Experian PDF report screens and history." },
    "experianPdf.generate": { title: "Generate Experian PDF", detail: "Submit Experian PDF report requests." },
    "faceMatch.view": { title: "View Face Match", detail: "Open face match screens and history." },
    "faceMatch.generate": { title: "Run Face Match", detail: "Submit selfie and identity-card face match requests." },
    "mcaCompany.view": { title: "View MCA Company Details", detail: "Open MCA company detail screens and history." },
    "mcaCompany.generate": { title: "Fetch MCA Company Details", detail: "Submit MCA company detail requests using CIN." },
    "prefill.view": { title: "View Prefill", detail: "Open bureau prefill screens and history." },
    "prefill.generate": { title: "Generate Prefill", detail: "Submit customer prefill requests." },
    "api.tuCibilPdf": { title: "TU CIBIL PDF API", detail: "Allow this customer to call the TU CIBIL PDF public API." },
    "api.tuCibilJson": { title: "TU CIBIL JSON API", detail: "Allow this customer to call the TU CIBIL JSON public API." },
    "api.equifaxCibilPdf": { title: "Equifax CIBIL PDF API", detail: "Allow this customer to call the Equifax PDF public API." },
    "api.equifaxCibilJson": { title: "Equifax CIBIL JSON API", detail: "Allow this customer to call the Equifax JSON public API." },
    "api.crifPdf": { title: "CRIF PDF API", detail: "Allow this customer to call the CRIF PDF public API." },
    "api.crifJson": { title: "CRIF JSON API", detail: "Allow this customer to call the CRIF JSON public API." },
    "api.panFullDetail": { title: "PAN Full Detail API", detail: "Allow this customer to call the PAN full-detail public API." },
    "api.aadhaarValidation": { title: "Aadhaar Validation API", detail: "Allow this customer to call the Aadhaar validation public API." },
    "api.aadhaarOtp": { title: "Aadhaar OTP API", detail: "Allow this customer to call the Aadhaar OTP public API." },
    "api.uanFetchByPan": { title: "Fetch UAN by PAN API", detail: "Allow this customer to call the UAN by PAN public API." },
    "api.uanProfileDetails": { title: "UAN Profile Details API", detail: "Allow this customer to call the UAN profile public API." },
    "api.employmentHistory": { title: "Employment History API", detail: "Allow this customer to call the employment history public API." },
    "api.epfoPassbook": { title: "EPFO Passbook API", detail: "Allow this customer to call the EPFO passbook public API." },
    "api.gstinVerification": { title: "GSTIN Verification API", detail: "Allow this customer to call the GSTIN verification public API." },
    "api.bankVerification": { title: "Bank Verification API", detail: "Allow this customer to call the bank verification public API." },
    "api.drivingLicense": { title: "Driving License API", detail: "Allow this customer to call the driving license verification public API." },
    "api.rcBasic": { title: "Basic RC API", detail: "Allow this customer to call the Basic RC verification public API." },
    "api.experianJson": { title: "Experian JSON API", detail: "Allow this customer to call the Experian JSON public API." },
    "api.experianPdf": { title: "Experian PDF API", detail: "Allow this customer to call the Experian PDF public API." },
    "api.faceMatch": { title: "Face Match API", detail: "Allow this customer to call the Face Match public API." },
    "api.mcaCompany": { title: "MCA Company Details API", detail: "Allow this customer to call the MCA company-details public API." },
    "api.prefill": { title: "Prefill API", detail: "Allow this customer to call the bureau Prefill public API." },
    "esign.view": { title: "View Aadhaar eSign", detail: "See Aadhaar eSign requests created from the panel." },
    "esign.generate": { title: "Create Aadhaar eSign", detail: "Create Aadhaar eSign requests from the panel." },
    "econsent.view": { title: "View e-Consent", detail: "See e-Consent requests created from the panel." },
    "econsent.generate": { title: "Create e-Consent", detail: "Create Aadhaar e-Consent sessions from the panel." },
    "api.esign": { title: "Aadhaar eSign API", detail: "Allow this customer to call the Aadhaar eSign public API." },
    "api.econsent": { title: "e-Consent API", detail: "Allow this customer to call the e-Consent public API." },
    "activity.view": { title: "View Logs", detail: "Review Account and API Activity." }
  },
  hi: {
    "dashboard.view": { title: "???????? ?????", detail: "????????? ?? ?????? ???? ??????" },
    "users.view": { title: "???? ?????", detail: "???????? ?? ?????? ?????? ??????" },
    "users.invite": { title: "???? ???????? ????", detail: "????? ???????? ?? ???????? ?????" },
    "wallet.view": { title: "????? ?????", detail: "????? ?????? ?? ???? ??????" },
    "wallet.recharge": { title: "????? ???????", detail: "Cashfree ?? ???????? ???????" },
    "roles.view": { title: "?????? ?????", detail: "????? ?????? ?? ?????? ??????" },
    "roles.assign": { title: "?????? ?????", detail: "?????? ???? ??? ????? ?????? ??????" },
    "cibil.view": { title: "TU CIBIL PDF ?????", detail: "TU CIBIL PDF ??????? ??????? ?? ???????? ??????" },
    "cibil.generate": { title: "TU CIBIL PDF ????? ????", detail: "?? TU CIBIL PDF ??????? ????????? ??????" },
    "cibilJson.view": { title: "TU CIBIL JSON ?????", detail: "TU CIBIL JSON ??????? ??????? ?? ???????? ??????" },
    "cibilJson.generate": { title: "TU CIBIL JSON ????? ????", detail: "?? TU CIBIL JSON ??????? ????????? ????? ?????" },
    "equifaxCibil.view": { title: "Equifax CIBIL PDF ?????", detail: "Equifax CIBIL PDF ??????? ??????? ?? ???????? ??????" },
    "equifaxCibil.generate": { title: "Equifax CIBIL PDF ????? ????", detail: "?? Equifax CIBIL PDF ??????? ????????? ??????" },
    "equifaxCibilJson.view": { title: "Equifax CIBIL JSON ?????", detail: "Equifax CIBIL JSON ??????? ??????? ?? ???????? ??????" },
    "equifaxCibilJson.generate": { title: "Equifax CIBIL JSON ????? ????", detail: "?? Equifax CIBIL JSON ??????? ????????? ????? ?????" },
    "crif.view": { title: "CRIF PDF ?????", detail: "CRIF PDF ??????? ??????? ?? ???????? ??????" },
    "crif.generate": { title: "CRIF PDF ????? ????", detail: "?? CRIF PDF ??????? ????????? ??????" },
    "crifJson.view": { title: "CRIF JSON ?????", detail: "CRIF JSON ??????? ??????? ?? ???????? ??????" },
    "crifJson.generate": { title: "CRIF JSON ????? ????", detail: "?? CRIF JSON ??????? ????????? ????? ?????" },
    "pan.view": { title: "PAN Verification", detail: "PAN full-detail verification records ?????" },
    "pan.generate": { title: "Generate PAN Verification", detail: "PAN full-detail verification request ?????" },
    "aadhaarValidation.view": { title: "Aadhaar Validation", detail: "Aadhaar validation records" },
    "aadhaarValidation.generate": { title: "Generate Aadhaar Validation", detail: "Aadhaar validation request" },
    "aadhaarOtp.view": { title: "Aadhaar OTP", detail: "Aadhaar OTP records" },
    "aadhaarOtp.generate": { title: "Generate Aadhaar OTP", detail: "Aadhaar OTP request" },
    "uanFetchByPan.view": { title: "UAN by PAN", detail: "UAN by PAN records" },
    "uanFetchByPan.generate": { title: "Fetch UAN by PAN", detail: "UAN by PAN request" },
    "uanProfileDetails.view": { title: "UAN Profile Details", detail: "UAN profile records" },
    "uanProfileDetails.generate": { title: "Fetch UAN Profile Details", detail: "UAN profile request" },
    "employmentHistory.view": { title: "Employment History", detail: "Employment history records" },
    "employmentHistory.generate": { title: "Fetch Employment History", detail: "Employment history request" },
    "epfoPassbook.view": { title: "EPFO Passbook", detail: "EPFO passbook records" },
    "epfoPassbook.generate": { title: "Fetch EPFO Passbook", detail: "EPFO passbook request" },
    "gstin.view": { title: "GSTIN Verification", detail: "GSTIN verification records" },
    "gstin.generate": { title: "Generate GSTIN Verification", detail: "GSTIN verification request" },
    "bankVerification.view": { title: "Bank Verification", detail: "Bank verification records" },
    "bankVerification.generate": { title: "Generate Bank Verification", detail: "Bank verification request" },
    "drivingLicense.view": { title: "Driving License", detail: "Driving license verification records" },
    "drivingLicense.generate": { title: "Generate Driving License", detail: "Driving license verification request" },
    "rcBasic.view": { title: "Basic RC", detail: "Basic RC verification records" },
    "rcBasic.generate": { title: "Generate Basic RC", detail: "Basic RC verification request" },
    "experianJson.view": { title: "Experian JSON", detail: "Experian JSON report records" },
    "experianJson.generate": { title: "Generate Experian JSON", detail: "Experian JSON report request" },
    "experianPdf.view": { title: "Experian PDF", detail: "Experian PDF report records" },
    "experianPdf.generate": { title: "Generate Experian PDF", detail: "Experian PDF report request" },
    "faceMatch.view": { title: "Face Match", detail: "Face match records" },
    "faceMatch.generate": { title: "Run Face Match", detail: "Face match request" },
    "api.tuCibilPdf": { title: "TU CIBIL PDF API", detail: "?? ?????? ?? TU CIBIL PDF public API call ???? ????" },
    "api.tuCibilJson": { title: "TU CIBIL JSON API", detail: "?? ?????? ?? TU CIBIL JSON public API call ???? ????" },
    "api.equifaxCibilPdf": { title: "Equifax CIBIL PDF API", detail: "?? ?????? ?? Equifax PDF public API call ???? ????" },
    "api.equifaxCibilJson": { title: "Equifax CIBIL JSON API", detail: "?? ?????? ?? Equifax JSON public API call ???? ????" },
    "api.crifPdf": { title: "CRIF PDF API", detail: "?? ?????? ?? CRIF PDF public API call ???? ????" },
    "api.crifJson": { title: "CRIF JSON API", detail: "?? ?????? ?? CRIF JSON public API call ???? ????" },
    "api.panFullDetail": { title: "PAN Full Detail API", detail: "?? ?????? ?? PAN public API call ???? ????" },
    "api.aadhaarValidation": { title: "Aadhaar Validation API", detail: "Aadhaar validation public API" },
    "api.aadhaarOtp": { title: "Aadhaar OTP API", detail: "Aadhaar OTP public API" },
    "api.uanFetchByPan": { title: "Fetch UAN by PAN API", detail: "UAN by PAN public API" },
    "api.uanProfileDetails": { title: "UAN Profile Details API", detail: "UAN profile public API" },
    "api.employmentHistory": { title: "Employment History API", detail: "Employment history public API" },
    "api.epfoPassbook": { title: "EPFO Passbook API", detail: "EPFO passbook public API" },
    "api.gstinVerification": { title: "GSTIN Verification API", detail: "GSTIN verification public API" },
    "api.bankVerification": { title: "Bank Verification API", detail: "Bank verification public API" },
    "api.drivingLicense": { title: "Driving License API", detail: "Driving license verification public API" },
    "api.rcBasic": { title: "Basic RC API", detail: "Basic RC verification public API" },
    "api.experianJson": { title: "Experian JSON API", detail: "Experian JSON public API" },
    "api.experianPdf": { title: "Experian PDF API", detail: "Experian PDF public API" },
    "api.faceMatch": { title: "Face Match API", detail: "Face match public API" },
    "esign.view": { title: "View Aadhaar eSign", detail: "Panel Aadhaar eSign requests" },
    "esign.generate": { title: "Create Aadhaar eSign", detail: "Create panel Aadhaar eSign requests" },
    "econsent.view": { title: "View e-Consent", detail: "Panel e-Consent requests" },
    "econsent.generate": { title: "Create e-Consent", detail: "Create panel e-Consent requests" },
    "api.esign": { title: "Aadhaar eSign API", detail: "Aadhaar eSign public API" },
    "api.econsent": { title: "e-Consent API", detail: "e-Consent public API" },
    "mcaCompany.view": { title: "View MCA Company Details", detail: "Open MCA company detail screens and history." },
    "mcaCompany.generate": { title: "Fetch MCA Company Details", detail: "Submit MCA company detail requests using CIN." },
    "prefill.view": { title: "View Prefill", detail: "Open bureau prefill screens and history." },
    "prefill.generate": { title: "Generate Prefill", detail: "Submit customer prefill requests." },
    "api.mcaCompany": { title: "MCA Company Details API", detail: "Allow this customer to call the MCA company-details public API." },
    "api.prefill": { title: "Prefill API", detail: "Allow this customer to call the bureau Prefill public API." },
    "activity.view": { title: "??? ?????", detail: "?????? ?? API ????????? ??????" }
  }
};

const roleDefaultPermissions: Record<Role, PermissionId[]> = {
  super_admin: permissionGroups.flatMap((group) => group.permissions),
  agent: [
    "dashboard.view",
    "users.view",
    "users.invite",
    "wallet.view",
    "wallet.recharge",
    "roles.view",
    "roles.assign",
    "cibil.view",
    "cibil.generate",
    "cibilJson.view",
    "cibilJson.generate",
    "equifaxCibil.view",
    "equifaxCibil.generate",
    "equifaxCibilJson.view",
    "equifaxCibilJson.generate",
    "crif.view",
    "crif.generate",
    "crifJson.view",
    "crifJson.generate",
    "pan.view",
    "pan.generate",
    "aadhaarValidation.view",
    "aadhaarValidation.generate",
    "aadhaarOtp.view",
    "aadhaarOtp.generate",
    "uanFetchByPan.view",
    "uanFetchByPan.generate",
    "uanProfileDetails.view",
    "uanProfileDetails.generate",
    "employmentHistory.view",
    "employmentHistory.generate",
    "epfoPassbook.view",
    "epfoPassbook.generate",
    "gstin.view",
    "gstin.generate",
    "bankVerification.view",
    "bankVerification.generate",
    "drivingLicense.view",
    "drivingLicense.generate",
    "rcBasic.view",
    "rcBasic.generate",
    "experianJson.view",
    "experianJson.generate",
    "experianPdf.view",
    "experianPdf.generate",
    "faceMatch.view",
    "faceMatch.generate",
    "api.tuCibilPdf",
    "api.tuCibilJson",
    "api.equifaxCibilPdf",
    "api.equifaxCibilJson",
    "api.crifPdf",
    "api.crifJson",
    "api.panFullDetail",
    "api.aadhaarValidation",
    "api.aadhaarOtp",
    "api.uanFetchByPan",
    "api.uanProfileDetails",
    "api.employmentHistory",
    "api.epfoPassbook",
    "api.gstinVerification",
    "api.bankVerification",
    "api.drivingLicense",
    "api.rcBasic",
    "api.experianJson",
    "api.experianPdf",
    "api.faceMatch",
    "esign.view",
    "esign.generate",
    "econsent.view",
    "econsent.generate",
    "api.esign",
    "api.econsent",
    "activity.view"
  ],
  sub_agent: [
    "dashboard.view",
    "users.view",
    "users.invite",
    "wallet.view",
    "wallet.recharge",
    "roles.view",
    "roles.assign",
    "cibil.view",
    "cibil.generate",
    "cibilJson.view",
    "cibilJson.generate",
    "equifaxCibil.view",
    "equifaxCibil.generate",
    "equifaxCibilJson.view",
    "equifaxCibilJson.generate",
    "crif.view",
    "crif.generate",
    "crifJson.view",
    "crifJson.generate",
    "pan.view",
    "pan.generate",
    "aadhaarValidation.view",
    "aadhaarValidation.generate",
    "aadhaarOtp.view",
    "aadhaarOtp.generate",
    "uanFetchByPan.view",
    "uanFetchByPan.generate",
    "uanProfileDetails.view",
    "uanProfileDetails.generate",
    "employmentHistory.view",
    "employmentHistory.generate",
    "epfoPassbook.view",
    "epfoPassbook.generate",
    "gstin.view",
    "gstin.generate",
    "bankVerification.view",
    "bankVerification.generate",
    "drivingLicense.view",
    "drivingLicense.generate",
    "rcBasic.view",
    "rcBasic.generate",
    "experianJson.view",
    "experianJson.generate",
    "experianPdf.view",
    "experianPdf.generate",
    "faceMatch.view",
    "faceMatch.generate",
    "api.tuCibilPdf",
    "api.tuCibilJson",
    "api.equifaxCibilPdf",
    "api.equifaxCibilJson",
    "api.crifPdf",
    "api.crifJson",
    "api.panFullDetail",
    "api.aadhaarValidation",
    "api.aadhaarOtp",
    "api.uanFetchByPan",
    "api.uanProfileDetails",
    "api.employmentHistory",
    "api.epfoPassbook",
    "api.gstinVerification",
    "api.bankVerification",
    "api.drivingLicense",
    "api.rcBasic",
    "api.experianJson",
    "api.experianPdf",
    "api.faceMatch",
    "esign.view",
    "esign.generate",
    "econsent.view",
    "econsent.generate",
    "api.esign",
    "api.econsent",
    "activity.view"
  ],
  user: [
    "dashboard.view",
    "wallet.view",
    "wallet.recharge",
    "cibil.view",
    "cibil.generate",
    "cibilJson.view",
    "cibilJson.generate",
    "equifaxCibil.view",
    "equifaxCibil.generate",
    "equifaxCibilJson.view",
    "equifaxCibilJson.generate",
    "crif.view",
    "crif.generate",
    "crifJson.view",
    "crifJson.generate",
    "pan.view",
    "pan.generate",
    "aadhaarValidation.view",
    "aadhaarValidation.generate",
    "aadhaarOtp.view",
    "aadhaarOtp.generate",
    "uanFetchByPan.view",
    "uanFetchByPan.generate",
    "uanProfileDetails.view",
    "uanProfileDetails.generate",
    "employmentHistory.view",
    "employmentHistory.generate",
    "epfoPassbook.view",
    "epfoPassbook.generate",
    "gstin.view",
    "gstin.generate",
    "bankVerification.view",
    "bankVerification.generate",
    "drivingLicense.view",
    "drivingLicense.generate",
    "rcBasic.view",
    "rcBasic.generate",
    "experianJson.view",
    "experianJson.generate",
    "experianPdf.view",
    "experianPdf.generate",
    "faceMatch.view",
    "faceMatch.generate",
    "api.tuCibilPdf",
    "api.tuCibilJson",
    "api.equifaxCibilPdf",
    "api.equifaxCibilJson",
    "api.crifPdf",
    "api.crifJson",
    "api.panFullDetail",
    "api.aadhaarValidation",
    "api.aadhaarOtp",
    "api.uanFetchByPan",
    "api.uanProfileDetails",
    "api.employmentHistory",
    "api.epfoPassbook",
    "api.gstinVerification",
    "api.bankVerification",
    "api.drivingLicense",
    "api.rcBasic",
    "api.experianJson",
    "api.experianPdf",
    "api.faceMatch",
    "esign.view",
    "esign.generate",
    "econsent.view",
    "econsent.generate",
    "api.esign",
    "api.econsent",
    "activity.view"
  ]
};

function permissionsForRole(role: Role) {
  return new Set(roleDefaultPermissions[role]);
}

const userBlockedPermissionSet = new Set<PermissionId>(["users.view", "users.invite", "roles.view", "roles.assign"]);
const mcaPrefillAssignablePermissionSet = new Set<PermissionId>([
  "mcaCompany.view",
  "mcaCompany.generate",
  "prefill.view",
  "prefill.generate",
  "api.mcaCompany",
  "api.prefill"
]);

function assignablePermissionsFor(actor: UserAccount, targetRole: Role) {
  return allAssignablePermissions.filter((permission) => {
    if (targetRole === "user" && userBlockedPermissionSet.has(permission)) return false;
    if (!permissionsForRole(targetRole).has(permission) && !mcaPrefillAssignablePermissionSet.has(permission)) return false;
    return actor.role === "super_admin" || userHasPermission(actor, permission);
  });
}

const copy: Record<Language, Record<string, string>> = {
  en: {
    appName: "Finrep",
    appMode: "TRUST LAYER FOR DATA-LED FINANCE",
    signInEyebrow: "SIGN IN",
    welcomeBack: "Welcome Back",
    loginSubtitle: "Sign in to your verification workspace.",
    emailAddress: "EMAIL ADDRESS",
    password: "PASSWORD",
    forgotPassword: "Forgot Password?",
    resendIn: "Resend In",
    resendOtp: "Resend OTP",
    passwordResetSent: "OTP sent to your email.",
    emailRequiredForReset: "Enter your email address first.",
    otp: "OTP",
    verifyOtp: "Verify OTP",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    resetPassword: "Reset Password",
    passwordUpdated: "Password updated. You can sign in now.",
    passwordMismatch: "Passwords do not match.",
    passwordResetIntro: "Enter the OTP sent to your email, then set a new password.",
    passwordLowercase: "One lowercase letter",
    passwordUppercase: "One uppercase letter",
    passwordNumber: "One number",
    passwordSpecial: "One special character",
    passwordMinimum: "At least 8 characters",
    signIn: "Sign In",
    searchPlaceholder: "Search CIBIL, PAN, Aadhaar, Wallet...",
    overview: "OVERVIEW",
    dashboard: "Dashboard",
    userManagement: "User Management",
    apiServices: "API Services",
    contactUs: "Contact Us",
    apiDocs: "API Docs",
    plans: "Plans",
    wallet: "Wallet",
    billing: "Billing",
    apiPricing: "API Pricing",
    reports: "Reports",
    tools: "Tools",
    cibilReport: "TU CIBIL PDF",
    cibilJsonReport: "TU CIBIL JSON",
    equifaxCibilReport: "Equifax CIBIL PDF",
    equifaxCibilJsonReport: "Equifax CIBIL JSON",
    crifReport: "CRIF PDF",
    crifJsonReport: "CRIF JSON",
    aadhaarVerification: "Aadhaar Verification",
    aadhaarValidation: "Aadhaar Validation",
    aadhaarOtp: "Aadhaar OTP",
    aadhaarEsign: "Aadhaar eSign",
    eConsent: "e-Consent",
    panVerification: "PAN Verification",
    uanFetchByPan: "Fetch UAN by PAN",
    uanProfileDetails: "UAN Profile Details",
    employmentHistory: "Employment History",
    epfoPassbook: "EPFO Passbook",
    income: "Income",
    gstinVerification: "GSTIN Verification",
    bankVerification: "Bank Verification",
    drivingLicense: "Driving License",
    rcBasic: "Basic RC",
    activityLogs: "Activity Logs",
    welcome: "Welcome Back",
    inviteTeamMember: "Invite Team Member",
    getHelp: "Get Help",
    talkToExpert: "Talk to Expert",
    helpIntro: "Open a WhatsApp chat with the platform expert.",
    helpUnavailable: "Add SUPER_ADMIN_WHATSAPP_NUMBER in backend/.env to enable WhatsApp help.",
    privacyPolicy: "Privacy Policy",
    termsConditions: "Terms & Conditions",
    copyright: "Copyright 2026 Finrep. All rights reserved.",
    projectName: "Finrep",
    agreeTerms: "I agree to the",
    termsRequired: "Please agree to the terms and conditions.",
    profession: "Profession",
    professionDuration: "Time in Profession",
    city: "City",
    searchUsers: "Search Users by Name, Email, Role...",
    searchPlans: "Search Plans by Name, Role, Recipient...",
    searchWalletActivity: "Search Wallet Activity...",
    searchCibilReports: "Search Credit Reports by Customer, PAN, Mobile, Status...",
    searchPanRecords: "Search PAN Records by Name, PAN, Status...",
    searchAadhaarRecords: "Search Aadhaar Records by Number, Status...",
    searchEsignRecords: "Search eSign Records by Name, Email, Phone, Status...",
    searchActivityLogs: "Search Activity Logs...",
    noData: "No Data",
    teamSize: "TEAM SIZE",
    verificationsRun: "VERIFICATIONS RUN",
    pendingRequests: "PENDING REQUESTS",
    reportsGenerated: "REPORTS GENERATED",
    activeAccounts: "Active Accounts",
    last30Days: "Last 30 Days",
    awaitingAction: "Awaiting Action",
    allTime: "All Time",
    trend: "TREND",
    monthlyVolume: "Monthly Verification Volume",
    runNewVerification: "Run New Verification",
    runCibil: "Generate TU CIBIL PDF",
    runCibilJson: "Generate TU CIBIL JSON",
    runEquifaxCibil: "Generate Equifax CIBIL PDF",
    runEquifaxCibilJson: "Generate Equifax CIBIL JSON",
    runCrif: "Generate CRIF PDF",
    runCrifJson: "Generate CRIF JSON",
    runAadhaar: "Verify Aadhaar",
    runAadhaarValidation: "Validate Aadhaar",
    runAadhaarOtp: "Generate Aadhaar OTP",
    createAadhaarEsign: "Create Aadhaar eSign",
    esignResponse: "eSign Response",
    documentId: "Document ID",
    sellingPrice: "Selling Price",
    profit: "Profit",
    openAadhaarEsign: "Open Aadhaar eSign",
    shareEConsent: "Share e-Consent",
    fetchDocumentStatus: "Fetch Document Status",
    downloadSignedDocument: "Download Signed Document",
    downloadAuditTrail: "Download Audit Trail",
    esignLinkUnavailable: "eSign link is not available in the provider response.",
    esignExpiredMessage: "24 hours have passed. Please create a new eSign request.",
    esignVerifiedMessage: "Document has already been verified.",
    completeAadhaarEsignNote: "Please complete Aadhaar eSign by clicking the button below.",
    checkEsignStatus: "Check eSign Status",
    esignNotCompleted: "Aadhaar eSign is not completed yet. Click Open Aadhaar eSign, finish signing, then check status.",
    runPan: "Verify PAN",
    runUanFetchByPan: "Fetch UAN by PAN",
    runUanProfileDetails: "Fetch UAN Profile Details",
    runEmploymentHistory: "Fetch Employment History",
    runEpfoPassbook: "Fetch EPFO Passbook",
    runGstinVerification: "Verify GSTIN",
    runBankVerification: "Verify Bank Account",
    runDrivingLicense: "Verify Driving License",
    runEConsent: "Create e-Consent",
    planGate: "API Plan Required",
    planGateMessage: "Purchase an active API plan before running verification requests.",
    managePlan: "Manage Plan",
    members: "Members",
    active: "Active",
    inactive: "Inactive",
    blocked: "Blocked",
    rejected: "Rejected",
    sent: "Sent",
    accepted: "Accepted",
    pending: "Pending",
    verifiedKyc: "Verified",
    unverifiedKyc: "Unverified",
    allUsers: "All",
    allPlans: "All Plans",
    myPlans: "My Plans",
    invite: "Invite",
    name: "Name",
    email: "Email",
    role: "Role",
    planStatus: "Plan Status",
    createdAt: "Created",
    targetRole: "Target Role",
    recentInvites: "Recent Invites",
    invitedBy: "Invited By",
    notInvited: "Direct Account",
    noInvitePermission: "This Role cannot invite another account.",
    actions: "Actions",
    createSpecificPlan: "Create Plan",
    cibilPlan: "CIBIL Plan",
    noUserPlan: "No CIBIL Plan Assigned Yet.",
    blockAccount: "Block Account",
    unblockAccount: "Unblock Account",
    accountBlocked: "Account Blocked",
    accountUnblocked: "Account Unblocked",
    planBuilder: "Plan Builder",
    createPlan: "Create Plan",
    purchasePlan: "Purchase Plan",
    purchaseCount: "Purchases",
    rechargeWallet: "Recharge Wallet",
    walletBalance: "Wallet Balance",
    connects: "Rupees",
    rechargeAmount: "Recharge Amount",
    recentWalletActivity: "Recent Wallet Activity",
    platformWalletActivity: "Platform Wallet Activity",
    currentBalance: "Current Balance",
    quickAmount: "Quick Amount",
    noWalletActivity: "No Wallet Activity Yet.",
    connectValue: "Point Value",
    rupeesPerConnect: "Rupees per Point",
    saveConnectValue: "Save Point Value",
    walletRateSaved: "Point Value Updated",
    apiPricingSaved: "API Pricing Updated",
    insufficientWallet: "Recharge Wallet to purchase this Plan.",
    planLocked: "Plan Required",
    planLockedMessage: "Ask your parent/admin to assign a CIBIL Plan before using this service.",
    completeKyc: "Complete KYC",
    aadhaarNumber: "Aadhaar Number",
    panNumber: "PAN Number",
    mobileNumber: "Mobile Number",
    gender: "Gender",
    male: "Male",
    female: "Female",
    other: "Other",
    dateOfBirth: "Date of Birth",
    address: "Address",
    pincode: "Pincode",
    viewReport: "View Report",
    viewJson: "View JSON",
    openJson: "Open JSON",
    downloadReport: "Download Report",
    verifyAadhaar: "Verify Aadhaar",
    verifyPan: "Verify PAN",
    kycPendingTitle: "KYC Pending Admin Review",
    kycPendingMessage: "Your Aadhaar, PAN, and Aadhaar eSign are submitted. Services stay locked until an administrator approves your KYC.",
    kycRequiredMessage: "Complete Aadhaar verification, PAN verification, and Aadhaar eSign to unlock the platform.",
    aadhaarEsignMessage: "Create the Aadhaar eSign request to submit KYC for admin review.",
    kycRejectedTitle: "KYC Rejected",
    kycRejectedMessage: "Review the administrator comments and reapply the requested documents.",
    reapplyKyc: "Reapply KYC",
    aadhaarIssue: "Aadhaar Issue",
    panIssue: "PAN Issue",
    esignIssue: "Aadhaar eSign Issue",
    rejectionComment: "Rejection Comment",
    aadhaarDetails: "Aadhaar Details",
    esignDetails: "eSign Details",
    panDetails: "PAN Details",
    lastMobileDigits: "Last Mobile Digits",
    ageRange: "Age Range",
    state: "State",
    clientId: "Client ID",
    fullName: "Full Name",
    invalidAadhaar: "Enter a valid Aadhaar number.",
    invalidMobile: "Enter a valid 10 digit mobile number.",
    invalidPan: "Enter a valid PAN number.",
    kycDetails: "KYC Details",
    approveKyc: "Approve KYC",
    rejectKyc: "Reject KYC",
    adminReviewRequired: "Admin KYC Approval Required",
    cashfreeUnavailable: "Cashfree checkout could not be loaded.",
    availablePlans: "Available Plans",
    craftedOnlyForYou: "Crafted Only for You",
    craftedFor: "Crafted for",
    craftForUser: "Craft for a Specific User",
    chooseUser: "Choose User",
    ownedPlans: "Plans You Control",
    price: "Price",
    credits: "Rupees",
    services: "Services",
    audience: "Audience",
    status: "Status",
    action: "Action",
    planName: "Plan Name",
    servicePricing: "CIBIL Rupee Cost",
    perSuccessCost: "Rupees per CIBIL Report",
    perSuccessfulVerification: "per Successful Verification",
    editPlan: "Edit Plan",
    deletePlan: "Delete Plan",
    confirmDeletePlan: "Delete this Plan?",
    deletePlanTitle: "Delete Plan",
    deletePlanMessage: "This Plan will be removed from Available Plans.",
    cancel: "Cancel",
    pan: "PAN",
    aadhaar: "Aadhaar",
    cibil: "CIBIL",
    noPlanCreation: "Users cannot create plans.",
    customerName: "Customer Name",
    identifier: "Identifier",
    submitCheck: "Submit Check",
    verificationResult: "Verification Result",
    verified: "Verified",
    expired: "Expired",
    score: "Score",
    riskBand: "Risk Band",
    serviceLocked: "Verification is locked until the active API Plan is purchased.",
    recentActivity: "Recent Activity",
    actor: "Actor",
    service: "Service",
    date: "Date",
    time: "Time",
    profile: "Profile",
    editProfile: "Edit Profile",
    updateProfile: "Update Profile",
    changeProfilePhoto: "Change Profile Photo",
    addNewPlan: "Add New Plan",
    close: "Close",
    chooseRole: "Choose Role",
    language: "Language",
    permissions: "Permissions",
    selected: "Selected",
    selectAll: "Select All",
    rowsPerPage: "Rows per Page",
    page: "Page",
    previous: "Previous",
    next: "Next",
    of: "of",
    clearAll: "Clear All",
    noSearchResults: "No Results Found.",
    contactSales: "Sales",
    contactSupport: "Support",
    contactIntro: "Reach the Finrep team for Product, Onboarding, or Support help.",
    operational: "All Systems Operational",
    save: "Save",
    logout: "Log Out",
    loading: "Loading...",
    error: "Something went wrong",
    formCreated: "Saved Successfully",
    inviteSent: "Invite Sent",
    planPurchased: "Plan Purchased",
    sessionExpired: "Your session expired after 30 minutes of inactivity. Please sign in again."
  },
  hi: {
    appName: "Finrep",
    appMode: "????-?????? ??????? ?? ??? ????? ?? ???",
    signInEyebrow: "???? ??",
    welcomeBack: "Finrep ??? ???? ?????? ??",
    loginSubtitle: "???? ?????????? ????????? ??? ???? ?? ?????",
    emailAddress: "???? ??????",
    password: "???????",
    forgotPassword: "??????? ??? ???",
    resendIn: "??? ?????",
    resendOtp: "Resend OTP",
    passwordResetSent: "OTP ???? ???? ?? ??? ???? ??? ???",
    emailRequiredForReset: "???? ???? ???? ?????? ???? ?????",
    otp: "OTP",
    verifyOtp: "OTP ???????? ????",
    newPassword: "??? ???????",
    confirmPassword: "??????? ??????? ????",
    resetPassword: "??????? ????? ????",
    passwordUpdated: "??????? ????? ?? ??? ??? ?? ?? ???? ?? ?? ???? ????",
    passwordMismatch: "??????? ??? ???? ?? ??? ????",
    passwordResetIntro: "???? ???? ?? ???? ??? OTP ???? ????, ??? ??? ??????? ??? ?????",
    passwordLowercase: "?? ???? ?????",
    passwordUppercase: "?? ???? ?????",
    passwordNumber: "?? ????",
    passwordSpecial: "?? ?????? ????????",
    passwordMinimum: "?? ?? ?? 8 ????????",
    signIn: "???? ??",
    searchPlaceholder: "CIBIL, PAN, ????, ????? ?????...",
    overview: "???????",
    dashboard: "????????",
    userManagement: "???? ?????????",
    apiServices: "API ??????",
    contactUs: "?????? ????",
    apiDocs: "API Docs",
    plans: "?????",
    wallet: "?????",
    reports: "Reports",
    tools: "?????",
    cibilReport: "TU CIBIL PDF",
    cibilJsonReport: "TU CIBIL JSON",
    equifaxCibilReport: "Equifax CIBIL PDF",
    equifaxCibilJsonReport: "Equifax CIBIL JSON",
    crifReport: "CRIF PDF",
    crifJsonReport: "CRIF JSON",
    aadhaarVerification: "???? ??????????",
    aadhaarValidation: "Aadhaar Validation",
    aadhaarOtp: "Aadhaar OTP",
    aadhaarEsign: "???? eSign",
    eConsent: "e-Consent",
    panVerification: "PAN ??????????",
    uanFetchByPan: "Fetch UAN by PAN",
    uanProfileDetails: "UAN Profile Details",
    employmentHistory: "Employment History",
    epfoPassbook: "EPFO Passbook",
    income: "Income",
    gstinVerification: "GSTIN Verification",
    bankVerification: "Bank Verification",
    drivingLicense: "Driving License",
    rcBasic: "Basic RC",
    activityLogs: "????????? ???",
    welcome: "Finrep ??? ???? ?????? ??",
    inviteTeamMember: "??? ????? ???????? ????",
    getHelp: "??? ???",
    talkToExpert: "???????? ?? ??? ????",
    helpIntro: "?????????? ???????? ?? WhatsApp ??? ??????",
    helpUnavailable: "WhatsApp ??? ?? ??? backend/.env ??? SUPER_ADMIN_WHATSAPP_NUMBER ???????",
    privacyPolicy: "???????? ????",
    termsConditions: "???? ?? ??????",
    copyright: "???????? 2026 Finrep. ?????????? ????????.",
    projectName: "Finrep",
    agreeTerms: "??? ???? ???",
    termsRequired: "????? ???? ?? ?????? ?? ???? ???.",
    profession: "????",
    professionDuration: "???? ??? ???",
    city: "???",
    searchUsers: "???, ????, ?????? ?? ???? ?????...",
    searchPlans: "???, ??????, ???????????? ?? ????? ?????...",
    searchWalletActivity: "????? ????????? ?????...",
    searchCibilReports: "??????, PAN, ??????, ?????? ?? ??????? ?????...",
    searchPanRecords: "???, PAN, ?????? ?? PAN ??????? ?????...",
    searchAadhaarRecords: "???? ????, ?????? ?? ??????? ?????...",
    searchEsignRecords: "???, ????, ???, ?????? ?? eSign ??????? ?????...",
    searchActivityLogs: "????????? ??? ?????...",
    noData: "??? ???? ????",
    teamSize: "??? ????",
    verificationsRun: "?????????? ??",
    pendingRequests: "??????? ?????????",
    reportsGenerated: "??????? ???????",
    activeAccounts: "?????? ??????",
    last30Days: "????? 30 ???",
    awaitingAction: "????????? ????",
    allTime: "?? ??",
    trend: "??????",
    monthlyVolume: "????? ?????????? ???????",
    runNewVerification: "??? ?????????? ?????",
    runCibil: "TU CIBIL PDF ????? ????",
    runCibilJson: "TU CIBIL JSON ????? ????",
    runEquifaxCibil: "Equifax CIBIL PDF ????? ????",
    runEquifaxCibilJson: "Equifax CIBIL JSON ????? ????",
    runCrif: "CRIF PDF ????? ????",
    runCrifJson: "CRIF JSON ????? ????",
    runAadhaar: "???? ???????? ????",
    runAadhaarValidation: "Validate Aadhaar",
    runAadhaarOtp: "Generate Aadhaar OTP",
    createAadhaarEsign: "???? eSign ?????",
    esignResponse: "eSign ?????????",
    documentId: "Document ID",
    sellingPrice: "?????? ??????",
    profit: "???",
    openAadhaarEsign: "Aadhaar eSign ?????",
    fetchDocumentStatus: "Document status fetch ????",
    downloadSignedDocument: "Signed Document Download ????",
    esignLinkUnavailable: "Provider response ??? eSign link available ???? ???",
    esignExpiredMessage: "24 ???? ???? ?? ?? ???? ????? ??? eSign request ??????",
    esignVerifiedMessage: "Document ???? ?? verified ?? ???? ???",
    completeAadhaarEsignNote: "????? ???? ??? ?? button ?? click ???? Aadhaar eSign ???? ?????",
    checkEsignStatus: "eSign Status Check ????",
    esignNotCompleted: "Aadhaar eSign ??? ???? ???? ??? ??? Open Aadhaar eSign ?? click ???? signing ???? ????, ??? status check ?????",
    runPan: "PAN ???????? ????",
    runUanFetchByPan: "Fetch UAN by PAN",
    runUanProfileDetails: "Fetch UAN Profile Details",
    runEmploymentHistory: "Fetch Employment History",
    runEpfoPassbook: "Fetch EPFO Passbook",
    runGstinVerification: "Verify GSTIN",
    runBankVerification: "Verify Bank Account",
    runDrivingLicense: "Verify Driving License",
    runEConsent: "Create e-Consent",
    planGate: "API ????? ?????",
    planGateMessage: "?????????? ????????? ????? ?? ???? ?????? API ????? ???????",
    managePlan: "????? ????? ????",
    members: "?????",
    active: "??????",
    inactive: "????????",
    blocked: "?????",
    sent: "???? ???",
    accepted: "???????",
    pending: "???????",
    verifiedKyc: "????????",
    unverifiedKyc: "??????????",
    allUsers: "???",
    allPlans: "??? ?????",
    myPlans: "???? ?????",
    invite: "???????? ????",
    name: "???",
    email: "????",
    role: "??????",
    planStatus: "????? ??????",
    createdAt: "????? ???",
    targetRole: "?????? ??????",
    recentInvites: "??? ?? ???????",
    invitedBy: "???????? ????",
    notInvited: "???????? ??????",
    noInvitePermission: "?? ?????? ??? ??? ?????? ???????? ???? ?? ?????",
    actions: "?????",
    createSpecificPlan: "????? ?????",
    cibilPlan: "CIBIL ?????",
    noUserPlan: "??? CIBIL ????? ????? ???? ???",
    blockAccount: "?????? ????? ????",
    unblockAccount: "?????? ??????? ????",
    accountBlocked: "?????? ????? ?? ???",
    accountUnblocked: "?????? ??????? ?? ???",
    planBuilder: "????? ??????",
    createPlan: "????? ?????",
    purchasePlan: "????? ??????",
    rechargeWallet: "????? ??????? ????",
    walletBalance: "????? ??????",
    connects: "???????",
    rechargeAmount: "??????? ??????",
    recentWalletActivity: "??? ?? ????? ?????????",
    platformWalletActivity: "?????????? ????? ?????????",
    currentBalance: "?????? ??????",
    quickAmount: "????? ??????",
    noWalletActivity: "??? ??? ????? ????????? ???? ???",
    connectValue: "????? ??????",
    rupeesPerConnect: "????? ????? ?????",
    saveConnectValue: "????? ?????? ??? ????",
    walletRateSaved: "?????? ?????? ????? ?? ??",
    insufficientWallet: "?? ????? ?????? ?? ??? ????? ??????? ?????",
    planLocked: "????? ?????",
    planLockedMessage: "?? ???? ?? ????? ???? ?? ???? parent/admin ?? CIBIL ????? ????? ???????",
    completeKyc: "KYC ???? ????",
    aadhaarNumber: "???? ????",
    panNumber: "PAN ????",
    dateOfBirth: "???? ????",
    address: "???",
    pincode: "??????",
    verifyAadhaar: "???? ??????? ????",
    verifyPan: "PAN ??????? ????",
    kycPendingTitle: "KYC ????? ??????? ??? ??",
    kycPendingMessage: "???? Aadhaar, PAN ?? Aadhaar eSign submit ?? ??? ??? Admin approval ?? services locked ???????",
    kycRequiredMessage: "Platform unlock ???? ?? ??? Aadhaar verification, PAN verification ?? Aadhaar eSign ???? ?????",
    aadhaarEsignMessage: "Admin review ?? ??? Aadhaar eSign request ??????",
    invalidAadhaar: "??? ???? ???? ???? ?????",
    invalidMobile: "??? 10 ????? ?? ?????? ???? ???? ?????",
    invalidPan: "??? PAN ???? ???? ?????",
    kycDetails: "KYC ???????",
    aadhaarDetails: "???? ???????",
    esignDetails: "eSign ???????",
    panDetails: "PAN ???????",
    esignIssue: "???? eSign ??????",
    approveKyc: "KYC ?????? ????",
    rejectKyc: "KYC ??????? ????",
    adminReviewRequired: "????? KYC ??????? ?????",
    cashfreeUnavailable: "Cashfree checkout ??? ???? ?? ?????",
    availablePlans: "?????? ?????",
    craftedOnlyForYou: "????? ???? ??? ????? ???",
    craftedFor: "?? ??? ????? ???",
    craftForUser: "???? ??? ???? ?? ??? ?????",
    chooseUser: "???? ?????",
    ownedPlans: "???? ??????? ???? ?????",
    price: "????",
    credits: "???????",
    services: "??????",
    audience: "??????",
    status: "??????",
    action: "?????",
    planName: "????? ???",
    servicePricing: "CIBIL ????? ?????",
    perSuccessCost: "????? CIBIL ??????? ?????",
    perSuccessfulVerification: "????? ??? ??????????",
    editPlan: "????? ???? ????",
    deletePlan: "????? ????? ????",
    confirmDeletePlan: "?? ????? ????? ?????",
    pan: "PAN",
    aadhaar: "????",
    cibil: "CIBIL",
    noPlanCreation: "???? ????? ???? ??? ?????",
    customerName: "?????? ?? ???",
    identifier: "???????????",
    submitCheck: "??? ????? ????",
    verificationResult: "?????????? ??????",
    viewReport: "??????? ?????",
    viewJson: "JSON ?????",
    openJson: "JSON ?????",
    downloadReport: "??????? ??????? ????",
    verified: "????????",
    expired: "??????",
    score: "?????",
    riskBand: "????? ????",
    serviceLocked: "?????? API ????? ?????? ?? ?????????? ??? ???",
    recentActivity: "??? ?? ?????????",
    actor: "?????",
    service: "????",
    time: "???",
    profile: "????????",
    editProfile: "???????? ???? ????",
    updateProfile: "???????? ????? ????",
    changeProfilePhoto: "???????? ???? ?????",
    addNewPlan: "??? ????? ??????",
    close: "??? ????",
    cancel: "???? ????",
    chooseRole: "?????? ?????",
    language: "????",
    permissions: "??????",
    selected: "???? ??",
    selectAll: "??? ?????",
    clearAll: "??? ?????",
    noSearchResults: "??? ?????? ???? ????.",
    contactSales: "?????",
    contactSupport: "??????",
    contactIntro: "????????, ?????????? ?? ?????? ??? ?? ??? Finrep ??? ?? ?????? ????.",
    operational: "??? ?????? ???? ???",
    save: "???",
    logout: "??? ???",
    loading: "??? ?? ??? ??...",
    error: "??? ??? ???",
    formCreated: "??????????? ??? ???",
    inviteSent: "??????? ???? ???",
    planPurchased: "????? ????? ???",
    sessionExpired: "30 ???? ?? ??? ??????? ???? ???? ?? ???? ???? ???? ?????? ?? ???? ????? ??? ?? ???? ?? ?????"
  }
};

const navItems: Array<{ id: View; key: string; icon: LucideIcon; roles?: Role[] }> = [
  { id: "dashboard", key: "dashboard", icon: LayoutDashboard },
  { id: "users", key: "userManagement", icon: Users, roles: ["super_admin", "agent", "sub_agent"] },
  { id: "wallet", key: "wallet", icon: IndianRupee },
  { id: "billing", key: "billing", icon: FileCheck2 },
  { id: "activity", key: "activityLogs", icon: ScrollText },
  { id: "alerts", key: "Alert", icon: Bell, roles: ["super_admin"] },
  { id: "apiPricing", key: "apiPricing", icon: Zap },
  { id: "apiDocs", key: "apiDocs", icon: FileSpreadsheet },
  { id: "contact", key: "contactUs", icon: Mail },
  { id: "reports", key: "reports", icon: FileSpreadsheet }
];

const viewPermissions: Partial<Record<View, PermissionId>> = {
  dashboard: "dashboard.view",
  users: "users.view",
  wallet: "wallet.view",
  billing: "wallet.view",
  cibil: "cibil.view",
  "cibil-json": "cibilJson.view",
  "tu-json-to-pdf": "cibilJson.view",
  "equifax-cibil": "equifaxCibil.view",
  "equifax-cibil-json": "equifaxCibilJson.view",
  crif: "crif.view",
  "crif-json": "crifJson.view",
  pan: "pan.view",
  "aadhaar-validation": "aadhaarValidation.view",
  "aadhaar-otp": "aadhaarOtp.view",
  "uan-fetch-by-pan": "uanFetchByPan.view",
  "uan-profile-details": "uanProfileDetails.view",
  "employment-history": "employmentHistory.view",
  "epfo-passbook": "epfoPassbook.view",
  "gstin-verification": "gstin.view",
  "bank-verification": "bankVerification.view",
  "driving-license": "drivingLicense.view",
  "rc-basic": "rcBasic.view",
  "experian-json": "experianJson.view",
  "experian-pdf": "experianPdf.view",
  "face-match": "faceMatch.view",
  "mca-company": "mcaCompany.view",
  prefill: "prefill.view",
  esign: "esign.view",
  econsent: "econsent.view",
  activity: "activity.view"
};

const serviceConfig: Record<ServiceKind, { key: string; icon: LucideIcon; placeholder: string }> = {
  pan: { key: "panVerification", icon: CreditCard, placeholder: "ABCDE1234F" },
  "aadhaar-validation": { key: "aadhaarValidation", icon: Fingerprint, placeholder: "123456789012" },
  "aadhaar-otp": { key: "aadhaarOtp", icon: Fingerprint, placeholder: "123456789012" },
  "uan-fetch-by-pan": { key: "uanFetchByPan", icon: CreditCard, placeholder: "ABCDE1234F" },
  "uan-profile-details": { key: "uanProfileDetails", icon: CreditCard, placeholder: "100000000000" },
  "employment-history": { key: "employmentHistory", icon: CreditCard, placeholder: "100000000000" },
  "epfo-passbook": { key: "epfoPassbook", icon: CreditCard, placeholder: "ABCDE1234F" },
  "gstin-verification": { key: "gstinVerification", icon: Landmark, placeholder: "27ABCDE1234F1Z5" },
  "bank-verification": { key: "bankVerification", icon: Landmark, placeholder: "123456789012" },
  "driving-license": { key: "drivingLicense", icon: CreditCard, placeholder: "DL0420110012345" },
  "rc-basic": { key: "rcBasic", icon: CreditCard, placeholder: "XX00XX0000" },
  "experian-json": { key: "Experian JSON", icon: Gauge, placeholder: "PAN / mobile / report ref" },
  "experian-pdf": { key: "Experian PDF", icon: FileDown, placeholder: "PAN / mobile / report ref" },
  "face-match": { key: "Face Match", icon: Fingerprint, placeholder: "Face match reference" },
  "mca-company": { key: "MCA Company Details", icon: Landmark, placeholder: "U12345MH2020PTC123456" },
  prefill: { key: "Prefill", icon: Gauge, placeholder: "9876543210" },
  esign: { key: "aadhaarEsign", icon: FileCheck2, placeholder: "9876543210" },
  econsent: { key: "eConsent", icon: FileCheck2, placeholder: "9876543210" },
  aadhaar: { key: "aadhaarVerification", icon: Fingerprint, placeholder: "1234 5678 9012" },
  cibil: { key: "cibilReport", icon: Gauge, placeholder: "PAN / mobile / report ref" },
  "cibil-json": { key: "cibilJsonReport", icon: Gauge, placeholder: "PAN / mobile / report ref" },
  "tu-json-to-pdf": { key: "TU JSON to PDF", icon: FileDown, placeholder: "Upload or paste TU JSON" },
  "equifax-cibil": { key: "equifaxCibilReport", icon: Gauge, placeholder: "PAN / mobile / report ref" },
  "equifax-cibil-json": { key: "equifaxCibilJsonReport", icon: Gauge, placeholder: "PAN / mobile / report ref" },
  crif: { key: "crifReport", icon: Gauge, placeholder: "mobile / report ref" },
  "crif-json": { key: "crifJsonReport", icon: Gauge, placeholder: "mobile / report ref" }
};

const creditReportServiceKeys: ServiceKind[] = ["cibil", "cibil-json", "equifax-cibil", "equifax-cibil-json", "crif", "crif-json", "experian-json", "experian-pdf", "prefill"];
const verificationServiceKeys: ServiceKind[] = ["pan", "aadhaar-validation", "aadhaar-otp", "uan-fetch-by-pan", "uan-profile-details", "employment-history", "epfo-passbook", "driving-license", "rc-basic", "face-match", "mca-company"];
const incomeServiceKeys: ServiceKind[] = ["gstin-verification", "bank-verification"];
const esignServiceKeys: ServiceKind[] = ["esign", "econsent"];
const jsonReportServiceKeys: ServiceKind[] = ["cibil-json", "equifax-cibil-json", "crif-json", "experian-json"];
const reportPermissionByService: Partial<Record<ServiceKind, PermissionId>> = {
  cibil: "cibil.generate",
  "cibil-json": "cibilJson.generate",
  "tu-json-to-pdf": "cibilJson.generate",
  "equifax-cibil": "equifaxCibil.generate",
  "equifax-cibil-json": "equifaxCibilJson.generate",
  crif: "crif.generate",
  "crif-json": "crifJson.generate",
  pan: "pan.generate",
  "aadhaar-validation": "aadhaarValidation.generate",
  "aadhaar-otp": "aadhaarOtp.generate",
  "uan-fetch-by-pan": "uanFetchByPan.generate",
  "uan-profile-details": "uanProfileDetails.generate",
  "employment-history": "employmentHistory.generate",
  "epfo-passbook": "epfoPassbook.generate",
  "gstin-verification": "gstin.generate",
  "bank-verification": "bankVerification.generate",
  "driving-license": "drivingLicense.generate",
  "rc-basic": "rcBasic.generate",
  "experian-json": "experianJson.generate",
  "experian-pdf": "experianPdf.generate",
  "face-match": "faceMatch.generate",
  "mca-company": "mcaCompany.generate",
  prefill: "prefill.generate",
  econsent: "econsent.generate"
};
const reportActionKeyByService: Partial<Record<ServiceKind, string>> = {
  cibil: "runCibil",
  "cibil-json": "runCibilJson",
  "equifax-cibil": "runEquifaxCibil",
  "equifax-cibil-json": "runEquifaxCibilJson",
  crif: "runCrif",
  "crif-json": "runCrifJson",
  "uan-fetch-by-pan": "runUanFetchByPan",
  "aadhaar-validation": "runAadhaarValidation",
  "aadhaar-otp": "runAadhaarOtp",
  "uan-profile-details": "runUanProfileDetails",
  "employment-history": "runEmploymentHistory",
  "epfo-passbook": "runEpfoPassbook",
  "gstin-verification": "runGstinVerification",
  "bank-verification": "runBankVerification",
  "driving-license": "runDrivingLicense",
  "rc-basic": "runRcBasic",
  "experian-json": "runExperianCreditReport",
  "experian-pdf": "runExperianCreditReport",
  "face-match": "runFaceMatch",
  "mca-company": "MCA Company Details",
  prefill: "Prefill",
  econsent: "runEConsent"
};
const indianStateOptions = [
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "CH", name: "Chandigarh" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "PY", name: "Puducherry" }
];

const defaultBillingSettings: BillingSettings = {
  firmName: "",
  firmAddress: "",
  supplierPincode: "",
  supplierStateCode: "",
  supplierState: "",
  supplierGstin: "",
  supplierPan: "",
  supplierPhone: "",
  supplierEmail: "",
  sacCode: "998314"
};

const publicApiBaseUrl = "https://api.thefinrep.com";
function apiDocsBaseUrlForUser(user: UserAccount) {
  const configured = String(user.whiteLabelApiDomain || "").trim().replace(/\/+$/, "");
  return configured || publicApiBaseUrl;
}

const publicApiDocs = [
  {
    id: "tu-cibil-pdf",
    category: "Bureau",
    name: "TU CIBIL PDF",
    method: "POST",
    path: "/v1/tu-cibil/pdf",
    response: "application/pdf",
    fields: [
      ["name", "Full customer name"],
      ["mobile", "10 digit mobile number"],
      ["pan_card", "PAN number"],
      ["gender", "male or female"],
      ["report_type", "Use cibil for TU CIBIL"],
      ["consent", "Use Y"]
    ],
    sample: {
      name: "Test User",
      mobile: "9876543210",
      pan_card: "ABCDE1234F",
      gender: "male",
      report_type: "cibil",
      consent: "Y"
    }
  },
  {
    id: "tu-cibil-json",
    category: "Bureau",
    name: "TU CIBIL JSON",
    method: "POST",
    path: "/v1/tu-cibil/json",
    response: "application/json",
    fields: [
      ["name", "Full customer name"],
      ["mobile", "10 digit mobile number"],
      ["pan_card", "PAN number"],
      ["gender", "male or female"],
      ["report_type", "Use cibil for TU CIBIL"],
      ["consent", "Use Y"]
    ],
    sample: {
      name: "Test User",
      mobile: "9876543210",
      pan_card: "ABCDE1234F",
      gender: "male",
      report_type: "cibil",
      consent: "Y"
    }
  },
  {
    id: "equifax-cibil-pdf",
    category: "Bureau",
    name: "Equifax CIBIL PDF",
    method: "POST",
    path: "/v1/equifax-cibil/pdf",
    response: "application/pdf",
    fields: [
      ["name", "Full customer name"],
      ["mobile", "10 digit mobile number"],
      ["pan_card", "PAN number"],
      ["gender", "male or female"],
      ["dob", "Date of birth in YYYY-MM-DD format"],
      ["address", "Full address"],
      ["state", "2-letter Indian state code, for example MP, HR, CH"],
      ["pincode", "6 digit pincode"],
      ["report_type", "Use equifax for Equifax CIBIL"],
      ["consent", "Use Y"]
    ],
    sample: {
      name: "Test User",
      mobile: "9876543210",
      pan_card: "ABCDE1234F",
      gender: "male",
      dob: "1998-01-01",
      address: "123 Test Street, Test Area",
      state: "DL",
      pincode: "110001",
      report_type: "equifax",
      consent: "Y"
    }
  },
  {
    id: "equifax-cibil-json",
    category: "Bureau",
    name: "Equifax CIBIL JSON",
    method: "POST",
    path: "/v1/equifax-cibil/json",
    response: "application/json",
    fields: [
      ["name", "Full customer name"],
      ["mobile", "10 digit mobile number"],
      ["pan_card", "PAN number"],
      ["gender", "male or female"],
      ["dob", "Date of birth in YYYY-MM-DD format"],
      ["address", "Full address"],
      ["state", "2-letter Indian state code, for example MP, HR, CH"],
      ["pincode", "6 digit pincode"],
      ["report_type", "Use equifax for Equifax CIBIL"],
      ["consent", "Use Y"]
    ],
    sample: {
      name: "Test User",
      mobile: "9876543210",
      pan_card: "ABCDE1234F",
      gender: "male",
      dob: "1998-01-01",
      address: "123 Test Street, Test Area",
      state: "DL",
      pincode: "110001",
      report_type: "equifax",
      consent: "Y"
    }
  },
  {
    id: "crif-pdf",
    category: "Bureau",
    name: "CRIF PDF",
    method: "POST",
    path: "/v1/crif/pdf",
    response: "application/pdf",
    fields: [
      ["name", "Full customer name"],
      ["mobile", "10 digit mobile number"],
      ["report_type", "Use crif for CRIF PDF"],
      ["consent", "Use Y"]
    ],
    sample: {
      name: "Test User",
      mobile: "9876543210",
      report_type: "crif",
      consent: "Y"
    }
  },
  {
    id: "crif-json",
    category: "Bureau",
    name: "CRIF JSON",
    method: "POST",
    path: "/v1/crif/json",
    response: "application/json",
    fields: [
      ["name", "Full customer name"],
      ["mobile", "10 digit mobile number"],
      ["pan", "PAN number, for example ABCDE1234F"],
      ["dob", "Date of birth in YYYY-MM-DD format"],
      ["consent", "Use Y"]
    ],
    sample: {
      name: "Test User",
      mobile: "9876543210",
      pan: "ABCDE1234F",
      dob: "1994-02-24",
      consent: "Y"
    }
  },
  {
    id: "pan-full-detail",
    category: "Verification",
    name: "PAN Verification",
    method: "POST",
    path: "/v1/pan/full-detail",
    response: "application/json",
    fields: [
      ["pan_number", "PAN number, for example ABCDE1234F"],
      ["consent", "Use Y"]
    ],
    sample: {
      pan_number: "ABCDE1234F",
      consent: "Y"
    }
  },
  {
    id: "aadhaar-validation",
    category: "Verification",
    name: "Aadhaar Validation",
    method: "POST",
    path: "/v1/aadhaar/validation",
    response: "application/json",
    fields: [
      ["aadhaar_number", "12 digit Aadhaar number"]
    ],
    sample: {
      aadhaar_number: "123456789012"
    }
  },
  {
    id: "aadhaar-otp-generate",
    category: "Verification",
    name: "Aadhaar OTP - Generate",
    method: "POST",
    path: "/v1/aadhaar/otp/generate",
    response: "application/json",
    fields: [
      ["id_number", "12 digit Aadhaar number"]
    ],
    sample: {
      id_number: "123456789012"
    }
  },
  {
    id: "aadhaar-otp-verify",
    category: "Verification",
    name: "Aadhaar OTP - Verify",
    method: "POST",
    path: "/v1/aadhaar/otp/verify",
    response: "application/json",
    fields: [
      ["otp", "OTP received on Aadhaar linked mobile"],
      ["request_id", "Request ID returned by Aadhaar OTP Generate"]
    ],
    sample: {
      otp: "123456",
      request_id: "3987654"
    }
  },
  {
    id: "uan-fetch-by-pan",
    category: "Verification",
    name: "Fetch UAN by PAN",
    method: "POST",
    path: "/v1/uan/fetch-by-pan",
    response: "application/json",
    fields: [
      ["pan_number", "Valid individual PAN number, for example ABCDE1234F"],
      ["consent", "Use Y"]
    ],
    sample: {
      pan_number: "ABCDE1234F",
      consent: "Y"
    }
  },
  {
    id: "uan-profile-details",
    category: "Verification",
    name: "UAN Profile Details",
    method: "POST",
    path: "/v1/uan/profile-details",
    response: "application/json",
    fields: [
      ["uan", "12 digit Universal Account Number"],
      ["consent", "Use Y"]
    ],
    sample: {
      uan: "100000000000",
      consent: "Y"
    }
  },
  {
    id: "employment-history",
    category: "Verification",
    name: "Employment History",
    method: "POST",
    path: "/v1/uan/employment-history",
    response: "application/json",
    fields: [
      ["uan_number", "12 digit Universal Account Number"],
      ["consent", "Use Y"]
    ],
    sample: {
      uan_number: "100000000000",
      consent: "Y"
    }
  },
  {
    id: "epfo-passbook",
    category: "Verification",
    name: "EPFO Passbook",
    method: "POST",
    path: "/v1/epfo/passbook",
    response: "application/json",
    fields: [
      ["mobile_number", "10 digit mobile number"],
      ["pan", "Valid PAN number, for example ABCDE1234F"],
      ["consent", "Use Y"]
    ],
    sample: {
      mobile_number: "9876543210",
      pan: "ABCDE1234F",
      consent: "Y"
    }
  },
  {
    id: "driving-license",
    category: "Verification",
    name: "Driving License Verification",
    method: "POST",
    path: "/v1/verification/driving-license",
    response: "application/json",
    fields: [
      ["id_number", "Driving License number"],
      ["dob", "Date of birth in YYYY-MM-DD format"]
    ],
    sample: {
      id_number: "DL0420110012345",
      dob: "1990-01-01"
    }
  },
  {
    id: "gstin-verification",
    category: "Income",
    name: "GSTIN Verification",
    method: "POST",
    path: "/v1/income/gstin-verification",
    response: "application/json",
    fields: [
      ["gstin", "GST Identification Number, for example 27ABCDE1234F1Z5"]
    ],
    sample: {
      gstin: "27ABCDE1234F1Z5"
    }
  },
  {
    id: "bank-verification",
    category: "Income",
    name: "Bank Verification",
    method: "POST",
    path: "/v1/income/bank-verification",
    response: "application/json",
    fields: [
      ["bank_account_number", "Bank account number"],
      ["ifsc", "Bank IFSC code"]
    ],
    sample: {
      bank_account_number: "123456789012",
      ifsc: "HDFC0001234"
    }
  },
  {
    id: "aadhaar-esign",
    category: "eSign",
    name: "Aadhaar eSign",
    method: "POST",
    path: "/v1/esign/aadhaar",
    response: "application/json",
    fields: [
      ["sender_name", "Business/company sending the document"],
      ["sender_email", "Official sender business/company email"],
      ["name", "Full legal name of signer/person completing e-Consent"],
      ["email", "Signer/person email address"],
      ["mobile", "10 digit mobile number"],
      ["document_title", "Display name of the document"],
      ["document_file", "PDF as data:application/pdf;base64,... or raw base64 PDF"],
      ["document_file_name", "Optional PDF file name. Defaults to document.pdf"],
      ["lead_id", "Optional client reference. Generated automatically if not sent"],
      ["contract_executer_name", "Optional sender/executer name. Defaults to Finrep"],
      ["success_redirect_url", "Optional URL where signer is redirected after successful signing"],
      ["error_redirect_url", "Optional URL where signer is redirected if signing fails or is cancelled"],
      ["consent", "Use Y"],
      ["consent_text", "Use the exact consent statement shown in sample"]
    ],
    sample: {
      name: "Test User",
      email: "test@example.com",
      mobile: "9876543210",
      document_title: "Test Agreement",
      document_file_name: "test-agreement.pdf",
      document_file: "data:application/pdf;base64,BASE64_PDF_DATA",
      success_redirect_url: "https://clientdomain.com/esign/success",
      error_redirect_url: "https://clientdomain.com/esign/failed",
      consent: "Y",
      consent_text: "We confirm obtaining valid customer consent to access/process their document. Consent remains valid, informed, and unwithdrawn."
    }
  },
  {
    id: "econsent",
    category: "eSign",
    name: "e-Consent",
    method: "POST",
    path: "/v1/esign/econsent",
    response: "application/json",
    fields: [
      ["sender_name", "Business/company sending the document"],
      ["sender_email", "Official sender email of the business/company"],
      ["name", "Full legal name of signer"],
      ["email", "Signer email address"],
      ["mobile", "10 digit mobile number"],
      ["document_title", "Display name of the document"],
      ["document_file", "PDF as data:application/pdf;base64,... or raw base64 PDF"],
      ["document_file_name", "Optional PDF file name. Defaults to document title"],
      ["location", "Optional signer location. Defaults to India"],
      ["date", "Optional ISO date/time. Defaults to current server time"],
      ["status route", "After create, call GET /v1/esign/econsent/{document_id}/status"],
      ["signed PDF route", "After signing, call GET /v1/esign/econsent/{document_id}/files/signed. Response is raw application/pdf; download as blob/arraybuffer, do not parse JSON."],
      ["audit trail route", "After signing, call GET /v1/esign/econsent/{document_id}/trail/download"]
    ],
    sample: {
      sender_name: "Example Business",
      sender_email: "sender@example.com",
      name: "Example Signer",
      email: "signer@example.com",
      mobile: "9876543210",
      document_title: "Consent Agreement",
      document_file_name: "consent-agreement.pdf",
      document_file: "data:application/pdf;base64,BASE64_PDF_DATA",
      location: "India",
      date: "2026-06-23T19:00:00"
    }
  },
  {
    id: "experian-json",
    category: "Bureau",
    name: "Experian JSON",
    method: "POST",
    path: "/v1/bureau/experian-json",
    response: "application/json",
    fields: [
      ["name", "Full customer name"],
      ["mobile_number", "10 digit mobile number"],
      ["date_of_birth", "Date of birth in DD/MM/YYYY format"],
      ["pan", "PAN number"],
      ["email", "Customer email address"],
      ["address", "Full customer address"],
      ["pincode", "6 digit pincode"]
    ],
    sample: {
      name: "Test User",
      mobile_number: "9876543210",
      date_of_birth: "05/07/1990",
      pan: "ABCDE1234F",
      email: "test.user@example.com",
      address: "101 Example Road, Indore, Madhya Pradesh",
      pincode: "452001"
    }
  },
  {
    id: "rc-basic",
    category: "Verification",
    name: "Basic RC Verification",
    method: "POST",
    path: "/v1/verification/rc-basic",
    response: "application/json",
    fields: [
      ["registration_number", "Vehicle registration number, for example XX00XX0000"]
    ],
    sample: {
      registration_number: "XX00XX0000"
    }
  },
  {
    id: "experian-pdf",
    category: "Bureau",
    name: "Experian PDF",
    method: "POST",
    path: "/v1/bureau/experian-pdf",
    response: "application/pdf",
    fields: [
      ["first_name", "Customer first name"],
      ["last_name", "Customer last name"],
      ["mobile_number", "10 digit mobile number"],
      ["date_of_birth", "Date of birth in DD/MM/YYYY format"],
      ["pan", "PAN number"],
      ["email", "Customer email address"],
      ["address", "Full customer address"],
      ["pincode", "6 digit pincode"]
    ],
    sample: {
      first_name: "Test",
      last_name: "User",
      mobile_number: "9876543210",
      date_of_birth: "05/07/1990",
      pan: "ABCDE1234F",
      email: "test.user@example.com",
      address: "101 Example Road, Indore, Madhya Pradesh",
      pincode: "452001"
    }
  },
  {
    id: "face-match",
    category: "Verification",
    name: "Face Match",
    method: "POST",
    path: "/v1/verification/face-match",
    response: "application/json",
    fields: [
      ["name", "Optional customer or reference name"],
      ["selfie_file", "Selfie image file (form-data File)"],
      ["card_image", "Identity-card image file (form-data File)"]
    ],
    sample: {
      name: "Test User",
      selfie_file: "@selfie.jpg",
      card_image: "@identity-card.jpg"
    }
  },
  {
    id: "econsent-status",
    category: "eSign",
    name: "e-Consent Status",
    method: "GET",
    path: "/v1/esign/econsent/{document_id}/status",
    response: "application/json",
    fields: [
      ["document_id", "Document ID returned by Create e-Consent"]
    ],
    sample: {}
  },
  {
    id: "econsent-share",
    category: "eSign",
    name: "e-Consent Share Link",
    method: "POST",
    path: "/v1/esign/econsent/{document_id}/share",
    response: "application/json",
    fields: [
      ["document_id", "Document ID returned by Create e-Consent"]
    ],
    sample: {}
  },
  {
    id: "econsent-signed-document",
    category: "eSign",
    name: "e-Consent Signed Document",
    method: "GET",
    path: "/v1/esign/econsent/{document_id}/files/signed",
    response: "application/pdf",
    fields: [
      ["document_id", "Document ID returned by Create e-Consent"],
      ["response handling", "Raw PDF binary. Use Axios responseType: arraybuffer, fetch response.arrayBuffer(), or save raw cURL body."]
    ],
    sample: {}
  },
  {
    id: "econsent-audit-trail",
    category: "eSign",
    name: "e-Consent Audit Trail",
    method: "GET",
    path: "/v1/esign/econsent/{document_id}/trail/download",
    response: "application/pdf",
    fields: [
      ["document_id", "Document ID returned by Create e-Consent"]
    ],
    sample: {}
  },
  {
    id: "prefill",
    category: "Bureau",
    name: "Prefill",
    method: "POST",
    path: "/v1/bureau/prefill",
    response: "application/json",
    fields: [["firstName", "Customer first name"], ["middleName", "Optional middle name"], ["lastName", "Customer last name"], ["mobileNumber", "10 digit mobile number"], ["remark", "Optional client note or reference"]],
    sample: { firstName: "Test", middleName: "Kumar", lastName: "User", mobileNumber: "9876543210", remark: "Customer onboarding" }
  },
  {
    id: "mca-company-details",
    category: "Verification",
    name: "MCA Company Details",
    method: "POST",
    path: "/v1/verification/mca-company-details",
    response: "application/json",
    fields: [["id_number", "21 character Corporate Identity Number (CIN)"], ["remark", "Optional client note or reference"]],
    sample: { id_number: "U12345MH2020PTC123456", remark: "Company onboarding" }
  }
];

const apiPermissionIds: PermissionId[] = [
  "api.tuCibilPdf",
  "api.tuCibilJson",
  "api.equifaxCibilPdf",
  "api.equifaxCibilJson",
  "api.crifPdf",
  "api.crifJson",
  "api.panFullDetail",
  "api.aadhaarValidation",
  "api.aadhaarOtp",
  "api.uanFetchByPan",
  "api.uanProfileDetails",
  "api.employmentHistory",
  "api.epfoPassbook",
  "api.gstinVerification",
  "api.bankVerification",
  "api.drivingLicense",
  "api.rcBasic",
  "api.experianJson",
  "api.experianPdf",
  "api.faceMatch",
  "api.mcaCompany",
  "api.prefill",
  "api.esign",
  "api.econsent"
];

const apiPermissionByPublicApiId: Record<string, PermissionId> = {
  "tu-cibil-pdf": "api.tuCibilPdf",
  "tu-cibil-json": "api.tuCibilJson",
  "equifax-cibil-pdf": "api.equifaxCibilPdf",
  "equifax-cibil-json": "api.equifaxCibilJson",
  "crif-pdf": "api.crifPdf",
  "crif-json": "api.crifJson",
  "pan-full-detail": "api.panFullDetail",
  "aadhaar-validation": "api.aadhaarValidation",
  "aadhaar-otp-generate": "api.aadhaarOtp",
  "aadhaar-otp-verify": "api.aadhaarOtp",
  "uan-fetch-by-pan": "api.uanFetchByPan",
  "uan-profile-details": "api.uanProfileDetails",
  "employment-history": "api.employmentHistory",
  "epfo-passbook": "api.epfoPassbook",
  "gstin-verification": "api.gstinVerification",
  "bank-verification": "api.bankVerification",
  "driving-license": "api.drivingLicense",
  "rc-basic": "api.rcBasic",
  "experian-json": "api.experianJson",
  "experian-pdf": "api.experianPdf",
  "face-match": "api.faceMatch",
  "mca-company-details": "api.mcaCompany",
  prefill: "api.prefill",
  "aadhaar-esign": "api.esign",
  "econsent": "api.econsent",
  "econsent-status": "api.econsent",
  "econsent-share": "api.econsent",
  "econsent-signed-document": "api.econsent",
  "econsent-audit-trail": "api.econsent"
};

const apiPriceKeyByPublicApiId: Record<string, keyof ApiPricing> = {
  "tu-cibil-pdf": "tuCibilPdf",
  "tu-cibil-json": "tuCibilJson",
  "equifax-cibil-pdf": "equifaxCibilPdf",
  "equifax-cibil-json": "equifaxCibilJson",
  "crif-pdf": "crifPdf",
  "crif-json": "crifJson",
  "pan-full-detail": "panFullDetail",
  "aadhaar-validation": "aadhaarValidation",
  "aadhaar-otp-generate": "aadhaarOtp",
  "aadhaar-otp-verify": "aadhaarOtp",
  "uan-fetch-by-pan": "uanFetchByPan",
  "uan-profile-details": "uanProfileDetails",
  "employment-history": "employmentHistory",
  "epfo-passbook": "epfoPassbook",
  "gstin-verification": "gstinVerification",
  "bank-verification": "bankVerification",
  "driving-license": "drivingLicense",
  "rc-basic": "rcBasic",
  "experian-json": "experianJson",
  "experian-pdf": "experianPdf",
  "face-match": "faceMatch",
  "mca-company-details": "mcaCompany",
  prefill: "prefill",
  "aadhaar-esign": "esign",
  "econsent": "econsent",
  "econsent-status": "econsent",
  "econsent-share": "econsent",
  "econsent-signed-document": "econsent",
  "econsent-audit-trail": "econsent"
};

const panelPermissionsByPublicApiId: Record<string, PermissionId[]> = {
  "tu-cibil-pdf": ["cibil.view", "cibil.generate"],
  "tu-cibil-json": ["cibilJson.view", "cibilJson.generate"],
  "equifax-cibil-pdf": ["equifaxCibil.view", "equifaxCibil.generate"],
  "equifax-cibil-json": ["equifaxCibilJson.view", "equifaxCibilJson.generate"],
  "crif-pdf": ["crif.view", "crif.generate"],
  "crif-json": ["crifJson.view", "crifJson.generate"],
  "pan-full-detail": ["pan.view", "pan.generate"],
  "aadhaar-validation": ["aadhaarValidation.view", "aadhaarValidation.generate"],
  "aadhaar-otp-generate": ["aadhaarOtp.view", "aadhaarOtp.generate"],
  "aadhaar-otp-verify": ["aadhaarOtp.view", "aadhaarOtp.generate"],
  "uan-fetch-by-pan": ["uanFetchByPan.view", "uanFetchByPan.generate"],
  "uan-profile-details": ["uanProfileDetails.view", "uanProfileDetails.generate"],
  "employment-history": ["employmentHistory.view", "employmentHistory.generate"],
  "epfo-passbook": ["epfoPassbook.view", "epfoPassbook.generate"],
  "gstin-verification": ["gstin.view", "gstin.generate"],
  "bank-verification": ["bankVerification.view", "bankVerification.generate"],
  "driving-license": ["drivingLicense.view", "drivingLicense.generate"],
  "rc-basic": ["rcBasic.view", "rcBasic.generate"],
  "experian-json": ["experianJson.view", "experianJson.generate"],
  "experian-pdf": ["experianPdf.view", "experianPdf.generate"],
  "face-match": ["faceMatch.view", "faceMatch.generate"],
  "mca-company-details": ["mcaCompany.view", "mcaCompany.generate"],
  prefill: ["prefill.view", "prefill.generate"],
  "aadhaar-esign": ["esign.view", "esign.generate"],
  "econsent": ["econsent.view", "econsent.generate"],
  "econsent-status": ["econsent.view", "econsent.generate"],
  "econsent-share": ["econsent.view", "econsent.generate"],
  "econsent-signed-document": ["econsent.view", "econsent.generate"],
  "econsent-audit-trail": ["econsent.view", "econsent.generate"]
};

const defaultPublicApiPricing: ApiPricing = {
  tuCibilPdf: 55,
  tuCibilJson: 55,
  equifaxCibilPdf: 55,
  equifaxCibilJson: 55,
  crifPdf: 55,
  crifJson: 55,
  panFullDetail: 7,
  aadhaarValidation: 7,
  aadhaarOtp: 7,
  uanFetchByPan: 7,
  uanProfileDetails: 7,
  employmentHistory: 7,
  epfoPassbook: 7,
  gstinVerification: 7,
  bankVerification: 7,
  drivingLicense: 7,
  rcBasic: 7,
  experianJson: 55,
  experianPdf: 55,
  faceMatch: 7,
  mcaCompany: 7,
  prefill: 7,
  esign: 40,
  econsent: 40
};

type ApiPricingFormValues = Record<keyof ApiPricing, string>;

function apiPricingToFormValues(pricing: Partial<ApiPricing> = {}): ApiPricingFormValues {
  return {
    tuCibilPdf: String(pricing.tuCibilPdf ?? defaultPublicApiPricing.tuCibilPdf),
    tuCibilJson: String(pricing.tuCibilJson ?? defaultPublicApiPricing.tuCibilJson),
    equifaxCibilPdf: String(pricing.equifaxCibilPdf ?? defaultPublicApiPricing.equifaxCibilPdf),
    equifaxCibilJson: String(pricing.equifaxCibilJson ?? defaultPublicApiPricing.equifaxCibilJson),
    crifPdf: String(pricing.crifPdf ?? defaultPublicApiPricing.crifPdf),
    crifJson: String(pricing.crifJson ?? defaultPublicApiPricing.crifJson),
    panFullDetail: String(pricing.panFullDetail ?? defaultPublicApiPricing.panFullDetail),
    aadhaarValidation: String(pricing.aadhaarValidation ?? defaultPublicApiPricing.aadhaarValidation),
    aadhaarOtp: String(pricing.aadhaarOtp ?? defaultPublicApiPricing.aadhaarOtp),
    uanFetchByPan: String(pricing.uanFetchByPan ?? defaultPublicApiPricing.uanFetchByPan),
    uanProfileDetails: String(pricing.uanProfileDetails ?? defaultPublicApiPricing.uanProfileDetails),
    employmentHistory: String(pricing.employmentHistory ?? defaultPublicApiPricing.employmentHistory),
    epfoPassbook: String(pricing.epfoPassbook ?? defaultPublicApiPricing.epfoPassbook),
    gstinVerification: String(pricing.gstinVerification ?? defaultPublicApiPricing.gstinVerification),
    bankVerification: String(pricing.bankVerification ?? defaultPublicApiPricing.bankVerification),
    drivingLicense: String(pricing.drivingLicense ?? defaultPublicApiPricing.drivingLicense),
    rcBasic: String(pricing.rcBasic ?? defaultPublicApiPricing.rcBasic),
    experianJson: String(pricing.experianJson ?? defaultPublicApiPricing.experianJson),
    experianPdf: String(pricing.experianPdf ?? defaultPublicApiPricing.experianPdf),
    faceMatch: String(pricing.faceMatch ?? defaultPublicApiPricing.faceMatch),
    mcaCompany: String(pricing.mcaCompany ?? defaultPublicApiPricing.mcaCompany),
    prefill: String(pricing.prefill ?? defaultPublicApiPricing.prefill),
    esign: String(pricing.esign ?? defaultPublicApiPricing.esign),
    econsent: String(pricing.econsent ?? defaultPublicApiPricing.econsent)
  };
}

function apiPricingFromFormValues(values: ApiPricingFormValues): ApiPricing {
  return {
    tuCibilPdf: Number(values.tuCibilPdf || 0),
    tuCibilJson: Number(values.tuCibilJson || 0),
    equifaxCibilPdf: Number(values.equifaxCibilPdf || 0),
    equifaxCibilJson: Number(values.equifaxCibilJson || 0),
    crifPdf: Number(values.crifPdf || 0),
    crifJson: Number(values.crifJson || 0),
    panFullDetail: Number(values.panFullDetail || 0),
    aadhaarValidation: Number(values.aadhaarValidation || 0),
    aadhaarOtp: Number(values.aadhaarOtp || 0),
    uanFetchByPan: Number(values.uanFetchByPan || 0),
    uanProfileDetails: Number(values.uanProfileDetails || 0),
    employmentHistory: Number(values.employmentHistory || 0),
    epfoPassbook: Number(values.epfoPassbook || 0),
    gstinVerification: Number(values.gstinVerification || 0),
    bankVerification: Number(values.bankVerification || 0),
    drivingLicense: Number(values.drivingLicense || 0),
    rcBasic: Number(values.rcBasic || 0),
    experianJson: Number(values.experianJson || 0),
    experianPdf: Number(values.experianPdf || 0),
    faceMatch: Number(values.faceMatch || 0),
    mcaCompany: Number(values.mcaCompany || 0),
    prefill: Number(values.prefill || 0),
    esign: Number(values.esign || 0),
    econsent: Number(values.econsent || 0)
  };
}

function isCreditReportService(service: ServiceKind) {
  return creditReportServiceKeys.includes(service);
}

function isApiVerificationService(service: ServiceKind) {
  return verificationServiceKeys.includes(service) || incomeServiceKeys.includes(service);
}

function isJsonReportService(service: ServiceKind) {
  return jsonReportServiceKeys.includes(service);
}

function userHasPermission(user: UserAccount, permission: PermissionId) {
  return user.role === "super_admin" || user.permissions?.includes(permission);
}

function userHasAnyApiPermission(user: UserAccount) {
  return apiPermissionIds.some((permission) => userHasPermission(user, permission));
}

function userHasPricingPermission(user: UserAccount, apiDocId: string) {
  return (
    userHasPermission(user, apiPermissionByPublicApiId[apiDocId]) ||
    (panelPermissionsByPublicApiId[apiDocId] || []).some((permission) => userHasPermission(user, permission))
  );
}

function userHasAnyPricingPermission(user: UserAccount) {
  return publicApiDocs.some((apiDoc) => userHasPricingPermission(user, apiDoc.id));
}

function permissionsIncludePricingAccess(permissions: string[], apiDocId: string) {
  return permissions.includes(apiPermissionByPublicApiId[apiDocId]) || (panelPermissionsByPublicApiId[apiDocId] || []).some((permission) => permissions.includes(permission));
}

function uniqueApiPricingDocs(docs: typeof publicApiDocs) {
  const seen = new Set<keyof ApiPricing>();
  return docs.filter((apiDoc) => {
    const priceKey = apiPriceKeyByPublicApiId[apiDoc.id];
    if (seen.has(priceKey)) return false;
    seen.add(priceKey);
    return true;
  });
}

function canAccessView(user: UserAccount, view: View) {
  if (view === "profile") return true;
  if (view === "contact") return true;
  if (view === "alerts") return user.role === "super_admin";
  if (view === "reports") return true;
  if (view === "apiDocs") return userHasAnyApiPermission(user);
  if (view === "apiPricing") return user.role === "super_admin" || userHasAnyApiPermission(user);
  if (view === "apiServices" || view === "apiServicesBureau" || view === "apiServicesVerification" || view === "apiServicesIncome" || view === "apiServicesEsign") {
    return [...creditReportServiceKeys, ...verificationServiceKeys, ...incomeServiceKeys, ...esignServiceKeys].some((service) => {
      const permission = viewPermissions[service];
      return permission ? userHasPermission(user, permission) : false;
    }) || user.role === "super_admin";
  }
  if (view === "plans") return false;
  if (view === "tools") return false;
  if (isVerificationView(view)) {
    if (isCreditReportService(view)) {
      const permission = viewPermissions[view];
      return permission ? userHasPermission(user, permission) : false;
    }
    if (isApiVerificationService(view)) {
      const permission = viewPermissions[view];
      return permission ? userHasPermission(user, permission) : false;
    }
    if (esignServiceKeys.includes(view as ServiceKind)) {
      const permission = viewPermissions[view];
      return permission ? userHasPermission(user, permission) : false;
    }
    return user.role === "super_admin";
  }
  const navItem = navItems.find((item) => item.id === view);
  if (!navItem || (navItem.roles && !navItem.roles.includes(user.role))) return false;
  const permission = viewPermissions[view];
  return !permission || userHasPermission(user, permission);
}

function canCreatePlanForMember(actor: UserAccount, member: UserAccount) {
  if (actor.id === member.id) return false;
  return inviteMatrix[actor.role].includes(member.role);
}

function canEditPermissionsForMember(actor: UserAccount, member: UserAccount) {
  if (!userHasPermission(actor, "roles.assign")) return false;
  if (actor.id === member.id || member.role === "super_admin") return false;
  return actor.role === "super_admin" || inviteMatrix[actor.role].includes(member.role);
}

function canManageAccountForMember(actor: UserAccount, member: UserAccount) {
  if (actor.id === member.id || member.role === "super_admin" || actor.role === "user") return false;
  if (actor.role === "super_admin") return true;
  return member.parentId === actor.id || member.invitedById === actor.id || inviteMatrix[actor.role].includes(member.role);
}

function dataKeyForView(view: View) {
  if (view === "users") return "users-support";
  if (view === "tools") return "wallet";
  if (view === "apiPricing") return "apiPricing";
  return "";
}

function isVerificationView(view: View): view is ServiceKind {
  return (
    view === "aadhaar" ||
    view === "aadhaar-validation" ||
    view === "aadhaar-otp" ||
    view === "esign" ||
    view === "econsent" ||
    view === "pan" ||
    view === "uan-fetch-by-pan" ||
    view === "uan-profile-details" ||
    view === "employment-history" ||
    view === "epfo-passbook" ||
    view === "gstin-verification" ||
    view === "bank-verification" ||
    view === "driving-license" ||
    view === "rc-basic" ||
    view === "face-match" ||
    view === "mca-company" ||
    view === "prefill" ||
    creditReportServiceKeys.includes(view as ServiceKind)
  );
}

function isApiServicesView(view: View) {
  return isVerificationView(view) && (isCreditReportService(view) || isApiVerificationService(view) || esignServiceKeys.includes(view));
}

function isApiServicesCategoryView(view: View) {
  return view === "apiServices" || view === "apiServicesBureau" || view === "apiServicesVerification" || view === "apiServicesIncome" || view === "apiServicesEsign";
}

function readStoredView(user: UserAccount): View {
  const urlView = new URLSearchParams(window.location.search).get("view") as View | null;
  if (urlView && canAccessView(user, urlView)) return urlView;
  const storedView = sessionStorage.getItem(VIEW_STORAGE_KEY) as View | null;
  return storedView && canAccessView(user, storedView) ? storedView : "dashboard";
}

function writeStoredView(view: View) {
  sessionStorage.setItem(VIEW_STORAGE_KEY, view);
}

function writeViewHistory(view: View, mode: "push" | "replace" = "push") {
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  const state = { ...(window.history.state || {}), dhaaraView: view };
  if (mode === "replace") {
    window.history.replaceState(state, "", url);
  } else {
    window.history.pushState(state, "", url);
  }
}

function loadCashfreeCheckout() {
  if (window.Cashfree) return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function blockInvalidNumberKeys(event: KeyboardEvent<HTMLInputElement>) {
  if (["e", "E", "+", "-"].includes(event.key)) {
    event.preventDefault();
  }
}

function passwordChecks(password: string) {
  return {
    passwordMinimum: password.length >= 8,
    passwordLowercase: /[a-z]/.test(password),
    passwordUppercase: /[A-Z]/.test(password),
    passwordNumber: /\d/.test(password),
    passwordSpecial: /[^A-Za-z0-9]/.test(password)
  };
}

function isStrongPasswordValue(password: string) {
  return Object.values(passwordChecks(password)).every(Boolean);
}

function normalizeAadhaar(value: string) {
  return value.replace(/\D/g, "");
}

function isValidAadhaarValue(value: string) {
  const aadhaar = normalizeAadhaar(value);
  if (!/^[2-9]\d{11}$/.test(aadhaar) || /^(\d)\1{11}$/.test(aadhaar)) return false;
  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];
  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];
  return aadhaar
    .split("")
    .reverse()
    .map(Number)
    .reduce((checksum, digit, index) => d[checksum][p[index % 8][digit]], 0) === 0;
}

function isValidPanValue(value: string) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase());
}

function normalizeIfscCode(value: string) {
  const clean = String(value || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 11);
  if (clean.length >= 5 && clean[4] === "O") {
    return `${clean.slice(0, 4)}0${clean.slice(5)}`;
  }
  return clean;
}

function isValidMobileValue(value: string) {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, ""));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected file"));
    reader.readAsDataURL(file);
  });
}

function removeDigits(value: string) {
  return value.replace(/\d/g, "");
}

function formatPanNameInput(value: string) {
  return removeDigits(value).toUpperCase();
}

function isPlaceholderPersonName(value: string) {
  return /^test(?:\s+user)?$/i.test(value.trim());
}

function initialPanFullName(user: UserAccount) {
  const name = String(user.kyc?.pan?.name || "").trim();
  return name && !isPlaceholderPersonName(name) ? formatPanNameInput(name) : "";
}

function formatDobInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function dobInputToApi(value: string) {
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : raw;
}

function text(t: Record<string, string>, key: string, fallback: string) {
  return t[key] || fallback;
}

function getDisplayError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = (error.message || "").trim();
  if (!message) return fallback;
  if (/^request failed\.?$/i.test(message)) return fallback;
  const isHindiFallback = /[\u0900-\u097F]/.test(fallback);
  const isLikelyEnglishMessage = /[A-Za-z]/.test(message) && !/[\u0900-\u097F]/.test(message);
  if (isHindiFallback && isLikelyEnglishMessage) return fallback;
  return message;
}

function findNestedProviderValue(source: unknown, keys: string[]): string {
  if (!source) return "";
  if (Array.isArray(source)) {
    for (const item of source) {
      const nested = findNestedProviderValue(item, keys);
      if (nested) return nested;
    }
    return "";
  }
  if (typeof source !== "object") return "";

  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  for (const value of Object.values(record)) {
    const nested = findNestedProviderValue(value, keys);
    if (nested) return nested;
  }

  return "";
}

function esignProviderResponse(source: unknown) {
  if (!source || typeof source !== "object") return {};
  const record = source as Record<string, unknown>;
  const details = record.details && typeof record.details === "object" ? record.details as Record<string, unknown> : {};
  const providerResponse = details.providerResponse || record.providerResponse || source;
  return providerResponse && typeof providerResponse === "object" ? providerResponse : {};
}

function esignStatusResponse(source: unknown) {
  if (!source || typeof source !== "object") return {};
  const record = source as Record<string, unknown>;
  const details = record.details && typeof record.details === "object" ? record.details as Record<string, unknown> : {};
  const providerResponse = esignProviderResponse(source) as Record<string, unknown>;
  const statusResponse = details.statusResponse || record.statusResponse || providerResponse.statusResponse;
  return statusResponse && typeof statusResponse === "object" ? statusResponse : {};
}

function esignDetails(source: unknown) {
  if (!source || typeof source !== "object") return {};
  const record = source as Record<string, unknown>;
  return record.details && typeof record.details === "object" ? record.details as Record<string, unknown> : {};
}

function esignSourceValue(source: unknown, keys: string[]) {
  const details = esignDetails(source);
  for (const key of keys) {
    const value = details[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return findNestedProviderValue(source, keys);
}

function esignIsIndisign(source: unknown) {
  const details = esignDetails(source);
  const providerResponse = esignProviderResponse(source) as Record<string, unknown>;
  return String(details.provider || providerResponse.provider || "").toLowerCase() === "indisign";
}

function esignIsEConsent(source: unknown) {
  if (!source || typeof source !== "object") return false;
  const record = source as Record<string, unknown>;
  const details = esignDetails(source);
  const providerResponse = esignProviderResponse(source) as Record<string, unknown>;
  const service = String(record.service || details.service || "").trim().toLowerCase().replace(/[_\s-]+/g, "");
  const provider = String(
    details.providerType ||
      details.providerName ||
      (typeof details.provider === "string" ? details.provider : "") ||
      providerResponse.provider ||
      ""
  ).trim().toLowerCase().replace(/[_\s-]+/g, "");
  return service === "econsent" || provider === "econsent";
}

function esignSendResponse(source: unknown) {
  const providerResponse = esignProviderResponse(source) as Record<string, unknown>;
  const sendResponse = providerResponse.sendResponse;
  return sendResponse && typeof sendResponse === "object" ? sendResponse as Record<string, unknown> : {};
}

function esignRequiresApproval(source: unknown) {
  const sendResponse = esignSendResponse(source);
  const statusResponse = esignStatusResponse(source) as Record<string, unknown>;
  return Boolean(sendResponse.requires_approval || statusResponse.requires_approval || statusResponse.status === "approval_required");
}

function esignApprovalId(source: unknown) {
  const sendResponse = esignSendResponse(source);
  const statusResponse = esignStatusResponse(source) as Record<string, unknown>;
  return String(sendResponse.approval_id || statusResponse.approval_id || "-");
}

function esignEmailDeliveryText(source: unknown) {
  const sendResponse = esignSendResponse(source);
  const emailsSent = Number(sendResponse.emails_sent || 0);
  const recipientsNotified = Number(sendResponse.recipients_notified || 0);
  if (Number.isFinite(emailsSent) && emailsSent > 0) return `${emailsSent} email sent`;
  if (Number.isFinite(recipientsNotified) && recipientsNotified > 0) return `${recipientsNotified} recipient notified`;
  return "Not sent yet";
}

function esignDocumentId(source: unknown) {
  if (!source || typeof source !== "object") return "-";
  const record = source as Record<string, unknown>;
  const providerResponse = esignProviderResponse(source);
  return String(
    record.providerReference ||
      findNestedProviderValue(providerResponse, [
        "envelopeId",
        "envelope_id",
        "contractId",
        "contract_id",
        "txnId",
        "txn_id",
        "documentId",
        "document_id",
        "documentID",
        "id",
        "requestId",
        "request_id",
        "client_id"
      ]) ||
      "-"
  );
}

function esignSigningUrl(source: unknown) {
  if (esignIsEConsent(source)) {
    const details = esignDetails(source);
    const providerResponse = esignProviderResponse(source);
    const value = findNestedProviderValue(details, [
      "signUrl",
      "sign_url",
      "shareUrl",
      "share_url"
    ]) || findNestedProviderValue(providerResponse, [
      "signUrl",
      "sign_url",
      "shareUrl",
      "share_url"
    ]);
    return /^https?:\/\//i.test(value) ? value : "";
  }

  const value = findNestedProviderValue(esignProviderResponse(source), [
    "workflowUrl",
    "workflow_url",
    "signUrl",
    "sign_url",
    "signLink",
    "sign_link",
    "signingUrl",
    "signing_url",
    "signingLink",
    "signing_link",
    "aadhaarEsignUrl",
    "aadhaar_esign_url",
    "aadhaarEsignLink",
    "aadhaar_esign_link",
    "redirectUrl",
    "redirect_url",
    "inviteUrl",
    "invite_url",
    "invitationLink",
    "invitation_link",
    "documentUrl",
    "document_url",
    "link",
    "url"
  ]);
  return /^https?:\/\//i.test(value) ? value : "";
}

function esignSignedDocumentUrl(source: unknown) {
  const details = esignDetails(source);
  const downloadResponse = details.downloadResponse && typeof details.downloadResponse === "object" ? details.downloadResponse : {};
  const statusResponse = esignStatusResponse(source);
  const value = findNestedProviderValue(downloadResponse, [
    "signedDocumentUrl",
    "signed_document_url",
    "signedDocUrl",
    "signed_doc_url",
    "signedPdfUrl",
    "signed_pdf_url",
    "downloadSignedDocumentUrl",
    "download_signed_document_url",
    "documentDownloadUrl",
    "document_download_url",
    "downloadUrl",
    "download_url",
    "pdfUrl",
    "pdf_url",
    "fileUrl",
    "file_url"
  ]) || findNestedProviderValue(statusResponse, [
    "signedDocumentUrl",
    "signed_document_url",
    "signedDocUrl",
    "signed_doc_url",
    "signedPdfUrl",
    "signed_pdf_url",
    "downloadSignedDocumentUrl",
    "download_signed_document_url",
    "documentDownloadUrl",
    "document_download_url",
    "downloadUrl",
    "download_url",
    "pdfUrl",
    "pdf_url"
  ]);
  if (/^https?:\/\//i.test(value)) return value;
  return "";
}

function esignPublicDocumentUrl(source: unknown) {
  const value = findNestedProviderValue(source, [
    "publicDocumentUrl",
    "public_document_url",
    "documentPublicUrl",
    "document_public_url",
    "publicUrl",
    "public_url"
  ]);
  if (/^https?:\/\//i.test(value)) return value;
  return "";
}

function esignMoney(source: unknown, keys: string[]) {
  const value = findNestedProviderValue(esignProviderResponse(source), keys);
  if (!value) return "-";
  if (/^\s*(?:\u20B9|Rs\.?)/i.test(value)) return value;
  const amount = Number(String(value).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount)) return value;
  return `\u20B9 ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(amount)}`;
}

function esignExpiryDate(source: unknown) {
  const explicitExpiry = findNestedProviderValue(esignProviderResponse(source), [
    "expiresAt",
    "expires_at",
    "expiry",
    "expiryDate",
    "expiry_date",
    "expiryAt",
    "expiry_at",
    "validTill",
    "valid_till",
    "validUntil",
    "valid_until",
    "linkExpiresAt",
    "link_expires_at"
  ]);
  const parsedExpiry = explicitExpiry ? new Date(explicitExpiry) : null;
  if (parsedExpiry && !Number.isNaN(parsedExpiry.getTime())) return parsedExpiry;

  if (source && typeof source === "object") {
    const record = source as Record<string, unknown>;
    const created = record.requestedAt || record.createdAt || record.completedAt;
    const parsedCreated = created ? new Date(String(created)) : null;
    if (parsedCreated && !Number.isNaN(parsedCreated.getTime())) {
      return new Date(parsedCreated.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  return null;
}

function esignIsExpired(source: unknown) {
  const expiresAt = esignExpiryDate(source);
  if (expiresAt && expiresAt.getTime() <= Date.now()) return true;

  if (!source || typeof source !== "object") return false;
  const record = source as Record<string, unknown>;
  const details = record.details && typeof record.details === "object" ? record.details as Record<string, unknown> : {};
  const statusResponse = esignStatusResponse(source) as Record<string, unknown>;
  const combined = `${statusResponse.status || ""} ${statusResponse.message || ""} ${details.status || ""} ${record.status || ""} ${record.riskBand || ""}`.toLowerCase();
  return combined.includes("expired") || combined.includes("link has expired");
}

function esignIsVerified(source: unknown) {
  if (!source || typeof source !== "object") return false;
  const record = source as Record<string, unknown>;
  const details = record.details && typeof record.details === "object" ? record.details as Record<string, unknown> : {};
  const statusResponse = esignStatusResponse(source) as Record<string, unknown>;
  const providerResponse = esignProviderResponse(source);
  const providerStatus = findNestedProviderValue(providerResponse, ["status", "documentStatus", "document_status", "signing_status", "envelope_status", "envelopeStatus"]);
  const providerMessage = findNestedProviderValue(providerResponse, ["message", "riskBand", "remarks", "reason"]);
  const authoritative = [statusResponse.status, statusResponse.message, details.status]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (
    authoritative.includes("not signed") ||
    authoritative.includes("not completed") ||
    authoritative.includes("pending") ||
    authoritative.includes("expired")
  ) {
    return false;
  }
  if (authoritative.includes("signed") || authoritative.includes("completed") || authoritative.includes("verified")) {
    return true;
  }

  const combined = [
    statusResponse.status,
    statusResponse.message,
    details.status,
    record.status,
    record.riskBand,
    providerStatus,
    providerMessage
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!combined) return false;
  if (
    combined.includes("not signed") ||
    combined.includes("not completed") ||
    combined.includes("pending") ||
    combined.includes("created") ||
    combined.includes("invitation sent") ||
    combined.includes("opened")
  ) {
    return false;
  }

  return combined.includes("signed") || combined.includes("completed") || combined.includes("verified");
}

function esignStatusLabel(source: unknown, t: Record<string, string>) {
  if (!source || typeof source !== "object") return "-";
  const record = source as Record<string, unknown>;
  const details = record.details && typeof record.details === "object" ? record.details as Record<string, unknown> : {};
  const statusResponse = esignStatusResponse(source) as Record<string, unknown>;
  const providerResponse = esignProviderResponse(source);
  const rawStatus = String(statusResponse.status || statusResponse.envelope_status || statusResponse.envelopeStatus || details.status || record.status || "").toLowerCase();
  const rawMessage = `${statusResponse.message || ""} ${record.riskBand || ""} ${findNestedProviderValue(providerResponse, ["message", "riskBand"]) || ""}`.toLowerCase();
  const combined = `${rawStatus} ${rawMessage}`;
  if (combined.includes("expired")) return text(t, "expired", "Expired");
  if (esignIsVerified(source)) return t.verified;
  if (rawStatus === "2" || combined.includes("processing")) return text(t, "processing", "Processing");
  if (combined.includes("pending") || combined.includes("created") || combined.includes("not signed")) return t.pending;
  if (combined.includes("failed")) return text(t, "failed", "Failed");
  return String(statusResponse.status || details.status || record.status || "-");
}


function rejectedKycDocuments(user: UserAccount) {
  const issues = user.kyc?.rejectionIssues;
  const hasIssueSelection = Boolean(issues?.aadhaar?.selected || issues?.pan?.selected || issues?.esign?.selected);
  return {
    aadhaar: Boolean(issues?.aadhaar?.selected) || (!hasIssueSelection && user.kycStatus === "rejected"),
    pan: Boolean(issues?.pan?.selected) || (!hasIssueSelection && user.kycStatus === "rejected"),
    esign: Boolean(issues?.esign?.selected) || (!hasIssueSelection && user.kycStatus === "rejected")
  };
}

function buildSearchIndex({
  user,
  t,
  language,
  visibleNav,
  hasActiveApiPlan
}: {
  user: UserAccount;
  t: Record<string, string>;
  language: Language;
  visibleNav: Array<{ id: View; key: string; icon: LucideIcon; roles?: Role[] }>;
  hasActiveApiPlan: boolean;
}): SearchItem<View>[] {
  const pageItems = visibleNav.map((item) => ({
    id: `page-${item.id}`,
    title: t[item.key],
    subtitle: t.overview,
    keywords: [item.id, item.key, item.id === "cibil" ? "credit score report" : item.id === "cibil-json" ? "cibil json report" : "", item.id === "aadhaar" ? "adhar uid verification" : ""],
    payload: item.id
  }));

  const actionItems: SearchItem<View>[] = [
    ...(inviteMatrix[user.role].length > 0 && userHasPermission(user, "users.invite")
      ? [{ id: "action-invite", title: t.inviteTeamMember, subtitle: t.userManagement, keywords: ["invite", "member", "agent", "sub agent", "super admin", "admin", "user"], payload: "users" as View }]
      : []),
    ...(hasActiveApiPlan && userHasPermission(user, "cibil.generate")
      ? [{ id: "action-cibil", title: t.runCibil, subtitle: t.cibilReport, keywords: ["cibil", "credit", "score", "report"], payload: "cibil" as View }]
      : []),
    ...(hasActiveApiPlan && userHasPermission(user, "cibilJson.generate")
      ? [{ id: "action-cibil-json", title: t.runCibilJson, subtitle: t.cibilJsonReport, keywords: ["cibil-json", "cibil", "json", "report"], payload: "cibil-json" as View }]
      : []),
    ...(hasActiveApiPlan && userHasPermission(user, "equifaxCibil.generate")
      ? [{ id: "action-equifax-cibil", title: text(t, "runEquifaxCibil", "Generate Equifax CIBIL PDF"), subtitle: text(t, "equifaxCibilReport", "Equifax CIBIL PDF"), keywords: ["equifax", "cibil", "pdf", "report"], payload: "equifax-cibil" as View }]
      : []),
    ...(hasActiveApiPlan && userHasPermission(user, "equifaxCibilJson.generate")
      ? [{ id: "action-equifax-cibil-json", title: text(t, "runEquifaxCibilJson", "Generate Equifax CIBIL JSON"), subtitle: text(t, "equifaxCibilJsonReport", "Equifax CIBIL JSON"), keywords: ["equifax", "cibil", "json", "report"], payload: "equifax-cibil-json" as View }]
      : []),
    ...(hasActiveApiPlan && userHasPermission(user, "crif.generate")
      ? [{ id: "action-crif", title: text(t, "runCrif", "Generate CRIF PDF"), subtitle: text(t, "crifReport", "CRIF PDF"), keywords: ["crif", "pdf", "report"], payload: "crif" as View }]
      : []),
    ...(hasActiveApiPlan && userHasPermission(user, "crifJson.generate")
      ? [{ id: "action-crif-json", title: text(t, "runCrifJson", "Generate CRIF JSON"), subtitle: text(t, "crifJsonReport", "CRIF JSON"), keywords: ["crif", "json", "report"], payload: "crif-json" as View }]
      : []),
    ...(user.role === "super_admin"
      ? [{ id: "action-aadhaar", title: t.runAadhaar, subtitle: t.aadhaarVerification, keywords: ["aadhaar", "adhar", "uid"], payload: "aadhaar" as View }]
      : []),
    ...(user.role === "super_admin"
      ? [
          {
            id: "action-esign",
            title: text(t, "createAadhaarEsign", "Create Aadhaar eSign"),
            subtitle: text(t, "aadhaarEsign", "Aadhaar eSign"),
            keywords: ["esign", "e-sign", "leegality", "aadhaar sign"],
            payload: "esign" as View
          }
        ]
      : []),
    ...(userHasPermission(user, "pan.generate")
      ? [{ id: "action-pan", title: t.runPan, subtitle: t.panVerification, keywords: ["pan", "card"], payload: "pan" as View }]
      : []),
    { id: "page-profile", title: t.profile, subtitle: roleLabels[language][user.role], keywords: ["profile", "account", "password"], payload: "profile" as View }
  ];

  return [...pageItems, ...actionItems];
}

function App() {
  const language: Language = "en";
  const legalRoute: "" | "terms" | "privacy" | "agent" =
    window.location.pathname === "/terms"
      ? "terms"
      : window.location.pathname === "/privacy"
        ? "privacy"
        : window.location.pathname === "/agent-agreement"
          ? "agent"
          : "";
  const [user, setUser] = useState<UserAccount | null>(() => {
    const session = readStoredSession();
    if (!session) return null;

    if (Date.now() - session.lastActivityAt >= SESSION_TIMEOUT_MS) {
      clearStoredSession();
      return null;
    }

    return session.user;
  });
  const [sessionMessage, setSessionMessage] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(() => Boolean(readStoredSession()?.token));
  const [apiPending, setApiPending] = useState(0);

  function handleAuthenticated(nextUser: UserAccount, token: string) {
    const now = Date.now();
    writeStoredSession({ token, user: nextUser, lastActivityAt: now, lastSyncedAt: now });
    setSessionMessage("");
    setUser(nextUser);
  }

  function handleUserChange(nextUser: UserAccount) {
    const session = readStoredSession();
    if (session) {
      writeStoredSession({ ...session, user: nextUser, lastActivityAt: Date.now() });
    }
    setUser(nextUser);
  }

  async function handleLogout() {
    try {
      if (readStoredSession()?.token) {
        await api.logout();
      }
    } catch {
      // The client clears the session even if the server token is already expired.
    }

    clearStoredSession();
    setUser(null);
  }

  function handleSessionExpired() {
    clearStoredSession();
    setUser(null);
    setSessionMessage(copy[language].sessionExpired);
  }

  useSessionInactivity(user, handleSessionExpired);

  useEffect(() => {
    function handleApiLoading(event: Event) {
      const pending = (event as CustomEvent<{ pending: number }>).detail?.pending || 0;
      setApiPending(pending);
    }

    window.addEventListener("dhaara-api-loading", handleApiLoading);
    return () => window.removeEventListener("dhaara-api-loading", handleApiLoading);
  }, []);

  useEffect(() => {
    function expireSessionFromApi() {
      handleSessionExpired();
    }

    window.addEventListener("dhaara-session-expired", expireSessionFromApi);
    return () => window.removeEventListener("dhaara-session-expired", expireSessionFromApi);
  }, [language]);

  useEffect(() => {
    let mounted = true;
    const session = readStoredSession();

    if (!session?.token) {
      setIsCheckingSession(false);
      return;
    }

    api
      .me()
      .then((response) => {
        if (!mounted) return;
        const now = Date.now();
        writeStoredSession({ ...session, user: response.user, lastActivityAt: now, lastSyncedAt: now });
        setUser(response.user);
      })
      .catch(() => {
        if (!mounted) return;
        clearStoredSession();
        setUser(null);
      })
      .finally(() => {
        if (mounted) setIsCheckingSession(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (legalRoute) {
    return <LegalPage type={legalRoute} />;
  }

  if (isCheckingSession) {
    return <FullPageLoader t={copy[language]} />;
  }

  if (!user) {
    return (
      <>
        {apiPending > 0 && <GlobalApiLoader />}
        <LoginScreen
          language={language}
          onAuthenticated={handleAuthenticated}
          sessionMessage={sessionMessage}
          onClearSessionMessage={() => setSessionMessage("")}
        />
      </>
    );
  }

  return (
    <>
      {apiPending > 0 && <GlobalApiLoader />}
      <AdminPanel
        language={language}
        user={user}
        onUserChange={handleUserChange}
        onLogout={handleLogout}
      />
    </>
  );
}

function LegalPage({ type }: { type: "terms" | "privacy" | "agent" }) {
  const isAgent = type === "agent";
  const legalDocument: LegalDocument | null = type === "terms" ? termsDocument : type === "privacy" ? privacyDocument : null;

  return (
    <main className="legal-page">
      <article className="legal-document">
        <p className="eyebrow">- Finrep</p>
        <h1>{isAgent ? "Agent & Sub Agent Registration Agreement" : legalDocument?.title}</h1>
        <p className="legal-updated">{isAgent ? "Last Updated: 10/05/2026" : legalDocument?.updated}</p>
        {isAgent
          ? agentAgreementSections.map((section) => (
              <section key={section.title}>
                <h2>{section.title}</h2>
                {section.body.map((paragraph) =>
                  paragraph === COMPANY_LEGAL_INFO ? (
                    <dl className="legal-company-info" key={paragraph}>
                      <div>
                        <dt>Company Name:</dt>
                        <dd>Finrep</dd>
                      </div>
                      <div>
                        <dt>Registered Office:</dt>
                        <dd>Sai Krupa Soc, B Wing, R No 606, Behind Giri Hotel, Mumbai, Maharashtra, India, PIN 400084</dd>
                      </div>
                      <div>
                        <dt>Contact Email:</dt>
                        <dd>info@thefinrep.com</dd>
                      </div>
                    </dl>
                  ) : (
                    <p key={paragraph}>{paragraph}</p>
                  )
                )}
              </section>
            ))
          : legalDocument?.paragraphs.map((paragraph, index) =>
              isLegalHeading(paragraph) ? (
                <h2 key={`${paragraph}-${index}`}>{paragraph}</h2>
              ) : (
                <p key={`${paragraph}-${index}`}>{paragraph}</p>
              )
            )}
      </article>
    </main>
  );
}

function isLegalHeading(paragraph: string) {
  const value = paragraph.trim();
  if (/^\d+\.\s+\S/.test(value)) return true;
  return value.length > 5 && value.length < 90 && value === value.toUpperCase() && /[A-Z]/.test(value);
}

const termsPrivacySections = [
  {
    title: "Introduction",
    body: [
      "Welcome to Finrep. These Terms and Conditions govern access, registration, and use of our web application/platform providing credit reports, banking facilitation services, financial information services, and related services.",
      "By registering, accessing, or using the Platform, the user agrees to be legally bound by these Terms in accordance with applicable laws of India. If you do not agree with these Terms, you must not access or use the Platform."
    ]
  },
  {
    title: "Eligibility and Registration",
    body: [
      "The user must be at least 18 years of age, legally competent under the Indian Contract Act, 1872, and must provide accurate and complete information during registration.",
      "Users may be required to provide name, mobile number, email address, PAN, Aadhaar where applicable, banking and financial information, business or employment details, and additional KYC or compliance documents."
    ]
  },
  {
    title: "Services and User Responsibilities",
    body: [
      "The Platform may provide credit report access and analysis, loan eligibility assessment, banking and financial advisory services, financial product facilitation, documentation support, credit score monitoring, and third-party financial institution integrations.",
      "The Company acts as a facilitator and technology platform and does not guarantee loan approvals, credit limits, or banking decisions. Users must not use the Platform for unlawful, fraudulent, impersonating, disruptive, or unauthorized purposes."
    ]
  },
  {
    title: "Privacy Policy and Data Consent",
    body: [
      "By registering, the user authorizes collection, storage, processing, and sharing of personal and financial data, including retrieval of credit information and reports from authorized credit bureaus such as TransUnion CIBIL, Experian India, CRIF High Mark, and Equifax India.",
      "The user authorizes information sharing with banks, NBFCs, financial institutions, verification agencies, technology partners, and service providers, and communication through calls, SMS, WhatsApp, email, and push notifications.",
      "The Company uses commercially reasonable safeguards including access controls, security monitoring, and encryption practices where applicable, but does not guarantee absolute security against cyber threats, unauthorized access, technical failures, force majeure events, government actions, telecommunications failures, or third-party breaches."
    ]
  },
  {
    title: "Payments, Third Parties, and Intellectual Property",
    body: [
      "Certain services may be chargeable. Users agree to pay applicable fees, service charges, taxes, processing fees, and third-party charges. Payments are subject to applicable laws and are non-refundable unless decided otherwise by the Company.",
      "Third-party services may be integrated with the Platform. The Company is not responsible for third-party decisions, loan rejections, service interruptions, privacy practices, or financial losses caused by third parties.",
      "All content, software, trademarks, logos, designs, databases, and technology used on the Platform are the property of the Company unless otherwise stated."
    ]
  },
  {
    title: "Liability, Suspension, Disputes, and Contact",
    body: [
      "Services are provided on a best-effort basis. The Company shall not be liable for indirect losses, consequential damages, loss of profits, data loss, business interruption, or banking or loan rejection decisions.",
      "The Company may suspend or terminate access for violation of Terms, fraudulent activity, suspicious activity, regulatory non-compliance, or lawful authority direction.",
      "Disputes shall first be attempted amicably. If unresolved within 30 days, disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, with seat and venue at Indore, Madhya Pradesh, India. Courts at Indore shall have exclusive jurisdiction, subject to arbitration provisions.",
      COMPANY_LEGAL_INFO
    ]
  }
];

const agentAgreementSections = [
  {
    title: "Introduction",
    body: [
      "This Agreement is entered into between Finrep and the individual or entity registering as an Agent or Sub Agent on the Platform.",
      "The Agreement governs credit report services, banking verification services, financial facilitation, customer onboarding, lead generation and loans selling, wallet recharge and service usage, reselling, referral activities, and related Platform access."
    ]
  },
  {
    title: "Eligibility and Platform Usage",
    body: [
      "The user must be at least 18 years old, legally competent under the Indian Contract Act, 1872, submit valid KYC documents, and provide accurate and updated information.",
      "The user agrees to use the Platform strictly for lawful business purposes and comply with RBI guidelines, applicable banking laws, data protection laws, the Information Technology Act, 2000, and applicable taxation laws."
    ]
  },
  {
    title: "Agent and Sub Agent Responsibilities",
    body: [
      "Agents and Sub Agents must ensure genuine and compliant customer onboarding, obtain customer consent before credit report requests, banking verification requests, or KYC submissions, and ensure all information is accurate and legally obtained.",
      "Agents and Sub Agents must not make false promises regarding loan approvals, banking sanctions, credit score improvement, or timelines, and are responsible for actions of their employees, associates, and referral partners."
    ]
  },
  {
    title: "Wallet, Payments, Refunds, and Profit Sharing",
    body: [
      "The Platform may operate on a prepaid wallet recharge mechanism. Wallet balance can be used only for available Platform services, is non-transferable, cannot be redeemed for cash, and cannot be withdrawn unless approved by the Company.",
      "All wallet recharges and payments are final. No refund, reversal, cancellation, or adjustment shall be provided once services are utilized, reports are generated, verification requests are initiated, API services are consumed, or customer processing has started.",
      "Profit sharing or commissions, if any, are subject to Company policy, compliance checks, successful transaction completion, and receipt of payments from institutions or partners."
    ]
  },
  {
    title: "Data Privacy, Intellectual Property, and Non-Bypass",
    body: [
      "The user must maintain confidentiality of customer data, banking data, credit reports, financial information, and Platform credentials. The Company may collect, store, process, verify, and share data with banks, NBFCs, credit bureaus, financial institutions, technology partners, and verification agencies.",
      "All software, branding, databases, APIs, content, designs, trademarks, and systems remain property of the Company. Agents and Sub Agents shall not bypass the Company to directly engage customers, banking partners, financial institutions, vendors, or technology partners introduced by the Company."
    ]
  },
  {
    title: "Suspension, Disputes, Digital Acceptance, and Contact",
    body: [
      "The Company may suspend or terminate access if fraudulent activity, regulatory violations, service misuse, suspicious transactions, chargebacks, or false information are detected.",
      "Disputes shall first be attempted amicably. If unresolved within 30 days, disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, with seat and venue at Indore, Madhya Pradesh, India.",
      "Acceptance through Aadhaar-based authentication, OTP verification, electronic consent, digital signature, or click-wrap acceptance constitutes legally valid consent under the Information Technology Act, 2000 and applicable electronic record laws.",
      COMPANY_LEGAL_INFO
    ]
  }
];

function useSessionInactivity(user: UserAccount | null, onExpired: () => void) {
  useEffect(() => {
    if (!user) return;
    const activeUser = user;

    function touch() {
      const session = readStoredSession();
      if (!session) return;

      const now = Date.now();
      const shouldSync = now - (session.lastSyncedAt || 0) >= SESSION_SYNC_MS;
      writeStoredSession({
        ...session,
        lastActivityAt: now,
        lastSyncedAt: shouldSync ? now : session.lastSyncedAt,
        user: activeUser
      });

      if (shouldSync) {
        api.me().catch(() => undefined);
      }
    }

    function checkExpiry() {
      const session = readStoredSession();
      if (!session) return;

      if (Date.now() - session.lastActivityAt >= SESSION_TIMEOUT_MS) {
        onExpired();
      }
    }

    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, touch, { passive: true }));
    const interval = window.setInterval(checkExpiry, 15000);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, touch));
      window.clearInterval(interval);
    };
  }, [onExpired, user]);
}

function LoginScreen({
  language,
  onAuthenticated,
  sessionMessage,
  onClearSessionMessage
}: {
  language: Language;
  onAuthenticated: (user: UserAccount, token: string) => void;
  sessionMessage: string;
  onClearSessionMessage: () => void;
}) {
  const t = copy[language];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetTimer, setResetTimer] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"otp" | "password">("otp");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (resetTimer <= 0) return;

    const timeout = window.setTimeout(() => setResetTimer((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearTimeout(timeout);
  }, [resetTimer]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setResetMessage("");
    onClearSessionMessage();

    if (!acceptedTerms) {
      setError(t.termsRequired);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await api.login(email, password);
      onAuthenticated(response.user, response.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError(t.emailRequiredForReset);
      setResetMessage("");
      return;
    }

    setIsResettingPassword(true);
    setError("");
    setResetMessage("");

    try {
      await api.requestForgotPasswordOtp(email);
      setResetMessage(t.passwordResetSent);
      setOtp("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setResetStep("otp");
      setResetOpen(true);
      setResetTimer(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsResettingPassword(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsResettingPassword(true);
    setError("");

    try {
      const response = await api.verifyForgotPasswordOtp(email, otp);
      setResetToken(response.resetToken);
      setResetStep("password");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsResettingPassword(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsResettingPassword(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      setIsResettingPassword(false);
      return;
    }

    if (!isStrongPasswordValue(newPassword)) {
      setError(t.passwordMinimum);
      setIsResettingPassword(false);
      return;
    }

    try {
      await api.resetForgotPassword({
        email,
        resetToken,
        password: newPassword,
        confirmPassword
      });
      setPassword("");
      setResetOpen(false);
      setResetMessage(t.passwordUpdated);
      setOtp("");
      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setResetStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel login-panel-split">
        <div className="login-visual" aria-hidden="true">
          <div className="ledger-mesh">
            <span className="mesh-line mesh-line-a" />
            <span className="mesh-line mesh-line-b" />
            <span className="mesh-line mesh-line-c" />
            <span className="mesh-pulse mesh-pulse-a" />
            <span className="mesh-pulse mesh-pulse-b" />
          </div>
          <div className="credit-orbit">
            <span className="orbit-dot orbit-dot-a" />
            <span className="orbit-dot orbit-dot-b" />
            <span className="orbit-dot orbit-dot-c" />
          </div>
          <div className="score-lens">
            <span>Credit Health</span>
            <strong>740</strong>
            <em>Finrep Verified</em>
          </div>
          <div className="api-ribbon">
            <span>PAN matched</span>
            <span>Bureau report ready</span>
            <span>Wallet secured</span>
          </div>
          <div className="login-visual-copy">
            <span className="visual-kicker">FINREP CREDIT DESK</span>
            <h2>Credit reports, wallet and bureau APIs in one secure workspace.</h2>
            <p>Reports, wallet and bureau workflows converge in one secure workspace.</p>
          </div>
        </div>

        <div className="login-auth-panel">
          <div className="login-topline">
            <Logo t={t} compact={false} />
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <p className="eyebrow">- {t.signInEyebrow}</p>

            <label>
              <span>{t.emailAddress}</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </label>

            <label>
              <span>
                {t.password}
                <button
                  className="text-link"
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResettingPassword || resetTimer > 0}
                >
                  {resetTimer > 0 ? `${t.resendIn} ${resetTimer}s` : t.forgotPassword}
                </button>
              </span>
              <PasswordField
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
            </label>

            {error && <p className="form-error">{error}</p>}
            {resetMessage && <p className="form-success">{resetMessage}</p>}
            {sessionMessage && <p className="form-error">{sessionMessage}</p>}

            <label className="terms-check">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
              <span>
                {t.agreeTerms}{" "}
                <a href={AGENT_AGREEMENT_URL} target="_blank" rel="noreferrer">
                  {t.termsConditions}
                </a>
              </span>
            </label>

            <button className="primary-button login-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.loading : t.signIn}
              <ArrowRight size={22} />
            </button>
          </form>
        </div>

        {resetOpen && (
          <Modal title={t.resetPassword} eyebrow={t.forgotPassword} onClose={() => setResetOpen(false)}>
            <p className="reset-modal-copy">{t.passwordResetIntro}</p>
            {resetStep === "otp" ? (
              <form className="form-grid" onSubmit={handleVerifyOtp}>
                <label>
                  <span>{t.emailAddress}</span>
                  <input value={email} readOnly />
                </label>
                <label>
                  <span>{t.otp}</span>
                  <input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" maxLength={6} required />
                </label>
                {error && <p className="form-error">{error}</p>}
                <button className="primary-button" type="submit" disabled={isResettingPassword}>
                  {isResettingPassword ? t.loading : t.verifyOtp}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResettingPassword || resetTimer > 0}
                >
                  {resetTimer > 0 ? `${t.resendIn} ${resetTimer}s` : t.resendOtp}
                </button>
              </form>
            ) : (
              <form className="form-grid" onSubmit={handleResetPassword}>
                <label>
                  <span>{t.newPassword}</span>
                  <PasswordField value={newPassword} onChange={setNewPassword} required autoComplete="new-password" />
                  <PasswordChecklist password={newPassword} t={t} />
                </label>
                <label>
                  <span>{t.confirmPassword}</span>
                  <PasswordField value={confirmPassword} onChange={setConfirmPassword} required autoComplete="new-password" />
                </label>
                {error && <p className="form-error">{error}</p>}
                <button className="primary-button" type="submit" disabled={isResettingPassword}>
                  {isResettingPassword ? t.loading : t.resetPassword}
                </button>
              </form>
            )}
          </Modal>
        )}
      </section>
    </main>
  );
}


function AdminPanel({
  language,
  user,
  onUserChange,
  onLogout
}: {
  language: Language;
  user: UserAccount;
  onUserChange: (user: UserAccount) => void;
  onLogout: () => void | Promise<void>;
}) {
  const t = copy[language];
  const [view, setView] = useState<View>(() => readStoredView(user));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("dhaara-sidebar-collapsed") === "true");
  const [apiServicesNavOpen, setApiServicesNavOpen] = useState(() => {
    const storedView = readStoredView(user);
    return isApiServicesCategoryView(storedView) || isApiServicesView(storedView);
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpError, setHelpError] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);
  const [apiPricing, setApiPricing] = useState<ApiPricingPayload | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedDataKeys, setLoadedDataKeys] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadingCountRef = useRef(0);

  const visibleNav = useMemo(() => navItems.filter((item) => canAccessView(user, item.id)), [user]);
  const visibleCreditReportServices = useMemo(
    () => creditReportServiceKeys.filter((service) => {
      if (user.role === "super_admin") return true;
      const permission = viewPermissions[service];
      return permission ? userHasPermission(user, permission) : false;
    }),
    [user]
  );
  const visibleVerificationServices = useMemo(
    () => verificationServiceKeys.filter((service) => {
      if (user.role === "super_admin") return true;
      const permission = viewPermissions[service];
      return permission ? userHasPermission(user, permission) : false;
    }),
    [user]
  );
  const visibleIncomeServices = useMemo(
    () => incomeServiceKeys.filter((service) => {
      if (user.role === "super_admin") return true;
      const permission = viewPermissions[service];
      return permission ? userHasPermission(user, permission) : false;
    }),
    [user]
  );
  const visibleEsignServices = useMemo(
    () => esignServiceKeys.filter((service) => user.role === "super_admin" || canAccessView(user, service)),
    [user]
  );
  const isBureauActive = view === "apiServices" || view === "apiServicesBureau" || (isVerificationView(view) && isCreditReportService(view));
  const isVerificationServiceActive = view === "apiServicesVerification" || verificationServiceKeys.includes(view as ServiceKind);
  const isIncomeServiceActive = view === "apiServicesIncome" || incomeServiceKeys.includes(view as ServiceKind);
  const isEsignServiceActive = view === "apiServicesEsign" || esignServiceKeys.includes(view as ServiceKind);
  const isApiServicesActive = isApiServicesCategoryView(view) || isBureauActive || isVerificationServiceActive || isIncomeServiceActive || isEsignServiceActive;
  const apiServicesTreeOpen = apiServicesNavOpen;
  const hasVisibleApiServices = visibleCreditReportServices.length > 0 || visibleVerificationServices.length > 0 || visibleIncomeServices.length > 0 || visibleEsignServices.length > 0;
  const hasActiveApiPlan = true;
  const requiresKycGate = false;
  const canViewWallet = userHasPermission(user, "wallet.view");
  const canRechargeWallet = userHasPermission(user, "wallet.recharge");
  const searchIndex = useMemo(() => buildSearchIndex({ user, t, language, visibleNav, hasActiveApiPlan }), [hasActiveApiPlan, language, t, user, visibleNav]);
  const searchResults = useMemo(() => searchItems(searchIndex, searchQuery), [searchIndex, searchQuery]);

  useEffect(() => {
    writeViewHistory(view, "replace");
  }, []);

  useEffect(() => {
    function handleBrowserNavigation() {
      const nextView = new URLSearchParams(window.location.search).get("view") as View | null;
      const safeView = nextView && canAccessView(user, nextView) ? nextView : "dashboard";
      setView(safeView);
      writeStoredView(safeView);
      setSearchQuery("");
      setSearchOpen(false);
      setSidebarOpen(false);
      setNotificationsOpen(false);
      setProfileMenuOpen(false);
    }

    window.addEventListener("popstate", handleBrowserNavigation);
    return () => window.removeEventListener("popstate", handleBrowserNavigation);
  }, [user]);

  useEffect(() => {
    if (canAccessView(user, view)) return;
    const nextView = visibleNav[0]?.id || "dashboard";
    if (isApiServicesCategoryView(nextView) || isApiServicesView(nextView)) {
      setApiServicesNavOpen(true);
    }
    setView(nextView);
    writeStoredView(nextView);
    writeViewHistory(nextView, "replace");
  }, [user, view, visibleNav]);

  function beginLoading() {
    loadingCountRef.current += 1;
    setLoading(true);
  }

  function endLoading() {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1);
    if (loadingCountRef.current === 0) {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadBootstrap() {
      setError("");
      beginLoading();
      try {
        const [nextBootstrap, nextWallet] = await Promise.all([
          api.bootstrap(),
          canViewWallet ? api.wallet() : Promise.resolve(null)
        ]);
        if (mounted) {
          setMetrics(nextBootstrap.dashboard);
          setNotifications(nextBootstrap.notifications);
          if (nextWallet) setWallet(nextWallet);
        }
      } catch (err) {
        if (mounted) {
          setError(getDisplayError(err, t.error));
        }
      } finally {
        endLoading();
      }
    }

    loadBootstrap();
    return () => {
      mounted = false;
    };
  }, [canViewWallet, refreshKey, t.error, user.id]);

  useEffect(() => {
    let mounted = true;

    api.alerts()
      .then((nextAlerts) => {
        if (mounted) setAlerts(nextAlerts);
      })
      .catch(() => {
        if (mounted) setAlerts([]);
      });

    return () => {
      mounted = false;
    };
  }, [refreshKey, user.id]);

  useEffect(() => {
    const dataKey = dataKeyForView(view);
    if (!dataKey || loadedDataKeys[dataKey] === refreshKey) return;

    let mounted = true;

    async function loadViewData() {
      setError("");
      beginLoading();
      try {
        if (view === "users") {
          const nextInvites = await api.invites();
          if (mounted) {
            setInvites(nextInvites);
          }
        } else if (view === "tools") {
          const nextWallet = canViewWallet ? await api.wallet() : null;
          if (mounted) setWallet(nextWallet);
        } else if (view === "apiPricing") {
          const [nextApiPricing, nextUsers] = await Promise.all([
            api.apiPricing(),
            user.role !== "user" ? api.usersPage({ page: 1, limit: 500 }) : Promise.resolve(null)
          ]);
          if (mounted) {
            setApiPricing(nextApiPricing);
            if (nextUsers) setUsers(nextUsers.items);
          }
        }

        if (mounted) {
          setLoadedDataKeys((keys) => ({ ...keys, [dataKey]: refreshKey }));
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : t.error);
        }
      } finally {
        endLoading();
      }
    }

    loadViewData();
    return () => {
      mounted = false;
    };
  }, [canViewWallet, loadedDataKeys, refreshKey, t.error, user.role, view]);

  function refresh() {
    setRefreshKey((key) => key + 1);
  }

  async function handlePurchase(planId: string) {
    const response = await api.purchasePlan(planId);
    onUserChange(response.user);
    const nextWallet = await api.wallet();
    setWallet(nextWallet);
    refresh();
  }

  async function refreshWallet() {
    const [nextWallet, nextNotifications] = await Promise.all([
      api.wallet(),
      api.notifications()
    ]);
    setWallet(nextWallet);
    setNotifications(nextNotifications);
    return nextWallet;
  }

  async function refreshNotifications() {
    const nextNotifications = await api.notifications();
    setNotifications(nextNotifications);
  }

  function navigateToView(nextView: View) {
    if (!canAccessView(user, nextView)) return;
    if (nextView === view) {
      setSearchQuery("");
      setSearchOpen(false);
      setSidebarOpen(false);
      setNotificationsOpen(false);
      setProfileMenuOpen(false);
      return;
    }
    if (isApiServicesCategoryView(nextView) || isApiServicesView(nextView)) {
      setApiServicesNavOpen(true);
    }
    setView(nextView);
    writeStoredView(nextView);
    writeViewHistory(nextView, "push");
    setSearchQuery("");
    setSearchOpen(false);
    setSidebarOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
  }

  function openSidebarMenu() {
    setSidebarOpen(true);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
    setSearchOpen(false);
  }

  function toggleNotificationsMenu() {
    setNotificationsOpen((open) => {
      const next = !open;
      if (next) {
        setProfileMenuOpen(false);
        setSidebarOpen(false);
        setSearchOpen(false);
      }
      return next;
    });
  }

  function toggleProfileMenu() {
    setProfileMenuOpen((open) => {
      const next = !open;
      if (next) {
        setNotificationsOpen(false);
        setSidebarOpen(false);
        setSearchOpen(false);
      }
      return next;
    });
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem("dhaara-sidebar-collapsed", String(next));
      return next;
    });
  }

  async function talkToExpert() {
    setHelpLoading(true);
    setHelpError("");
    try {
      const contact = await api.helpContact();
      const number = contact.whatsappNumber.replace(/\D/g, "");
      if (!number) {
        throw new Error(t.helpUnavailable);
      }
      window.open(`https://wa.me/${number}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message = err instanceof Error ? err.message : t.error;
      setHelpError(message);
      setError(message);
    } finally {
      setHelpLoading(false);
    }
  }

  function canRunServiceVerification(service: ServiceKind) {
    if (user.role === "super_admin") return true;
    if (service === "aadhaar") {
      return false;
    }
    if (esignServiceKeys.includes(service)) {
      const permission = reportPermissionByService[service];
      return permission ? userHasPermission(user, permission) : false;
    }
    if (isCreditReportService(service) || isApiVerificationService(service)) {
      const permission = reportPermissionByService[service];
      return permission ? userHasPermission(user, permission) : false;
    }

    return userHasPermission(user, "cibil.generate");
  }

  function renderView() {
    if (view === "profile") {
      return <ProfileView language={language} t={t} user={user} onUpdated={onUserChange} />;
    }
    if (view === "apiDocs") {
      return <ApiDocsView t={t} user={user} onUpdated={onUserChange} />;
    }

    if (view === "alerts") {
      return <AlertsView alerts={alerts} onSaved={setAlerts} />;
    }

    if (view === "reports") {
      return <ReportsView language={language} t={t} />;
    }

    if (view === "dashboard") {
      return (
        <DashboardView
          language={language}
          t={t}
          user={user}
          metrics={metrics}
          loading={loading}
          alerts={alerts}
          wallet={wallet}
        />
      );
    }

    if (view === "users") {
      return (
        <UserManagementView
          language={language}
          t={t}
          user={user}
          users={users}
          invites={invites}
          plans={plans}
          loading={loading}
          onChanged={refresh}
        />
      );
    }

    if (view === "contact") {
      return <ContactView t={t} user={user} />;
    }

    if (view === "plans") {
      return (
        <PlansView
          language={language}
          t={t}
          user={user}
          plans={plans}
          loading={loading}
          onChanged={refresh}
          onPurchase={handlePurchase}
        />
      );
    }

    if (view === "wallet") {
      return <WalletView language={language} t={t} user={user} wallet={wallet} canRecharge={canRechargeWallet} onRecharge={() => setRechargeModalOpen(true)} />;
    }

    if (view === "billing") {
      return <BillingView language={language} t={t} user={user} />;
    }

    if (view === "apiPricing") {
      return <ApiPricingView t={t} user={user} users={users} pricingPayload={apiPricing} onChanged={(nextPricing) => setApiPricing(nextPricing)} />;
    }

    if (isApiServicesCategoryView(view)) {
      return (
        <ApiServicesView
          t={t}
          mode={view === "apiServicesEsign" ? "esign" : view === "apiServicesIncome" ? "income" : view === "apiServicesVerification" ? "verification" : view === "apiServicesBureau" ? "bureau" : "all"}
          bureauServices={visibleCreditReportServices}
          verificationServices={visibleVerificationServices}
          incomeServices={visibleIncomeServices}
          esignServices={visibleEsignServices}
          canRunService={canRunServiceVerification}
          onNavigate={navigateToView}
        />
      );
    }

    if (view === "tools") {
      return <DashboardView language={language} t={t} user={user} metrics={metrics} loading={loading} wallet={wallet} />;
    }

    if (view === "activity") {
      return <ActivityView language={language} t={t} user={user} activities={activities} loading={loading} />;
    }

    if (view === "tu-json-to-pdf") {
      return <TuJsonPdfView user={user} canGenerate={canRunServiceVerification(view)} />;
    }

    if (!isVerificationView(view)) {
      return <DashboardView language={language} t={t} user={user} metrics={metrics} loading={loading} wallet={wallet} />;
    }

    return (
      <VerificationView
        service={view}
        language={language}
        t={t}
        user={user}
        canRunVerification={canRunServiceVerification(view)}
        onChanged={refresh}
      />
    );
  }

  return (
    <div className={sidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-head">
          <Logo t={t} compact />
          <button
            className="icon-button desktop-sidebar-toggle"
            type="button"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <button className="icon-button mobile-close sidebar-mobile-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close Menu">
            <X size={20} />
          </button>
        </div>

        <nav>
          <p className="nav-section">{t.overview}</p>
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const locked = isVerificationView(item.id) && !canRunServiceVerification(item.id);
            return (
              <Fragment key={item.id}>
              <button
                className={view === item.id ? "nav-item active" : "nav-item"}
                type="button"
                onClick={() => navigateToView(item.id)}
              >
                <Icon size={24} />
                <span className="nav-label">{text(t, item.key, item.key)}</span>
                {locked && <Lock className="nav-lock" size={15} />}
              </button>
              {item.id === "wallet" && hasVisibleApiServices && (
                <div className="nav-tree">
                  <button
                    className={isApiServicesActive ? "nav-item nav-group active" : "nav-item nav-group"}
                    type="button"
                    onClick={() => setApiServicesNavOpen((open) => !open)}
                    aria-expanded={apiServicesTreeOpen}
                  >
                    <FileSpreadsheet size={24} />
                    <span className="nav-label">{text(t, "apiServices", "API Services")}</span>
                    <ChevronDown className={apiServicesTreeOpen ? "nav-caret open" : "nav-caret"} size={16} />
                  </button>
                  {apiServicesTreeOpen && !sidebarCollapsed && (
                    <div className="nav-subtree">
                      {visibleCreditReportServices.length > 0 && (
                        <button
                          className={isBureauActive ? "nav-item nav-branch active" : "nav-item nav-branch"}
                          type="button"
                          onClick={() => navigateToView("apiServicesBureau")}
                        >
                          <Gauge size={20} />
                          <span className="nav-label">Bureau</span>
                        </button>
                      )}
                      {visibleVerificationServices.length > 0 && (
                        <button
                          className={isVerificationServiceActive ? "nav-item nav-branch active" : "nav-item nav-branch"}
                          type="button"
                          onClick={() => navigateToView("apiServicesVerification")}
                        >
                          <CreditCard size={20} />
                          <span className="nav-label">Verification</span>
                        </button>
                      )}
                      {visibleIncomeServices.length > 0 && (
                        <button
                          className={isIncomeServiceActive ? "nav-item nav-branch active" : "nav-item nav-branch"}
                          type="button"
                          onClick={() => navigateToView("apiServicesIncome")}
                        >
                          <Landmark size={20} />
                          <span className="nav-label">{text(t, "income", "Income")}</span>
                        </button>
                      )}
                      {visibleEsignServices.length > 0 && (
                        <button
                          className={isEsignServiceActive ? "nav-item nav-branch active" : "nav-item nav-branch"}
                          type="button"
                          onClick={() => navigateToView("apiServicesEsign")}
                        >
                          <FileCheck2 size={20} />
                          <span className="nav-label">eSign</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              </Fragment>
            );
          })}
        </nav>

        <div className="system-status-pill">
          <span />
          {t.operational}
        </div>
      </aside>
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close Menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="workarea">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" onClick={openSidebarMenu} aria-label="Open Menu">
            <Menu size={22} />
          </button>
          <div className="search-shell" onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}>
            <label className="search-box">
              <Search size={22} />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => {
                  setNotificationsOpen(false);
                  setProfileMenuOpen(false);
                  setSearchOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchResults[0]) {
                    event.preventDefault();
                    navigateToView(searchResults[0].payload);
                  }
                }}
                placeholder={t.searchPlaceholder}
              />
            </label>
            {searchOpen && searchQuery.trim() && (
              <div className="search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <button type="button" key={item.id} onMouseDown={() => navigateToView(item.payload)}>
                      <Search size={16} />
                      <span>
                        <strong>{item.title}</strong>
                        {item.subtitle && <small>{item.subtitle}</small>}
                      </span>
                    </button>
                  ))
                ) : (
                  <p>{t.noSearchResults}</p>
                )}
              </div>
            )}
          </div>
          {canViewWallet && (
            <button className="wallet-top-pill" type="button" onClick={() => setRechargeModalOpen(true)} disabled={!canRechargeWallet}>
              <IndianRupee size={17} />
              <span>{formatConnects(wallet?.balance ?? user.walletBalance ?? 0)}</span>
              {(wallet?.balance ?? user.walletBalance ?? 0) < 150 && <small className="wallet-low-badge">Low</small>}
            </button>
          )}
          <div className="notification-shell">
            <button className="icon-button notification" type="button" aria-label="Notifications" onClick={toggleNotificationsMenu}>
              <Bell size={24} />
              {notifications.filter((item) => !item.read).length > 0 && <span>{notifications.filter((item) => !item.read).length}</span>}
            </button>
            {notificationsOpen && (
              <div className="notification-dropdown">
                <div className="notification-head">
                  <strong>Notifications</strong>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.markAllNotificationsRead();
                      await refreshNotifications();
                    }}
                  >
                    Mark All as Read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p>{t.noData}</p>
                ) : (
                  notifications.map((item) => (
                    <button
                      className={item.read ? "notification-item read" : "notification-item"}
                      type="button"
                      key={item.id}
                      onClick={async () => {
                        await api.markNotificationRead(item.id);
                        await refreshNotifications();
                      }}
                    >
                      <strong>{item.action}</strong>
                      <span>{item.service} - {formatShortDate(item.createdAt, language)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="topbar-user-menu">
            <button
              className={view === "profile" ? "user-pill active" : "user-pill"}
              type="button"
              onClick={toggleProfileMenu}
              aria-label={t.profile}
            >
              <div className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name)}</div>
              <div>
                <strong>{user.name}</strong>
                <span>{roleLabels[language][user.role]}</span>
              </div>
            </button>
            {profileMenuOpen && (
              <div className="profile-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    navigateToView("profile");
                    setProfileMenuOpen(false);
                  }}
                >
                  <CircleUserRound size={18} />
                  {t.profile}
                </button>
                <button type="button" onClick={onLogout}>
                  <LogOut size={18} />
                  {t.logout}
                </button>
              </div>
            )}
          </div>
        </header>
        {rechargeModalOpen && canRechargeWallet && (
          <RechargeWalletModal
            language={language}
            t={t}
            user={user}
            wallet={wallet}
            onChanged={refreshWallet}
            onClose={() => setRechargeModalOpen(false)}
          />
        )}
        <button
          className="floating-whatsapp"
          type="button"
          onClick={talkToExpert}
          disabled={helpLoading}
          aria-label={t.talkToExpert}
          title={helpError || t.talkToExpert}
        >
          {helpLoading ? <span className="button-loader" /> : <MessageCircle size={24} />}
        </button>

        {requiresKycGate && (
          <KycGateModal
            t={t}
            user={user}
            onUpdated={onUserChange}
          />
        )}

        <main className={view === "dashboard" ? "content dashboard-content" : "content"}>
          {error && <p className="form-error page-error">{error}</p>}
          {renderView()}
        </main>
        <AppFooter t={t} />
      </div>
    </div>
  );
}

function KycGateModal({
  t,
  user,
  onUpdated
}: {
  t: Record<string, string>;
  user: UserAccount;
  onUpdated: (user: UserAccount) => void;
}) {
  const rejectedDocs = rejectedKycDocuments(user);
  const [step, setStep] = useState<"aadhaar" | "esign" | "pan">(
    !user.kyc?.aadhaar?.verifiedAt || rejectedDocs.aadhaar ? "aadhaar" : !user.kyc?.pan?.verifiedAt || rejectedDocs.pan ? "pan" : "esign"
  );
  const [reapplyOpen, setReapplyOpen] = useState(user.kycStatus !== "rejected");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [esignPhone, setEsignPhone] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [fullName, setFullName] = useState(() => initialPanFullName(user));
  const [dob, setDob] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const hasActiveEsignRequest =
    user.kyc?.esign?.status !== "rejected" &&
    !esignIsExpired(user.kyc?.esign) &&
    Boolean(user.kyc?.esign?.providerReference || user.kyc?.esign?.providerResponse);
  const esignMobileValue = hasActiveEsignRequest ? String(user.kyc?.esign?.phone || esignPhone) : esignPhone;

  useEffect(() => {
    if (step === "pan") {
      setFullName(initialPanFullName(user));
    }
  }, [step, user.id, user.kyc?.pan?.name]);

  if (user.kycStatus === "rejected" && !reapplyOpen) {
    const aadhaarIssue = user.kyc?.rejectionIssues?.aadhaar;
    const panIssue = user.kyc?.rejectionIssues?.pan;
    const esignIssue = user.kyc?.rejectionIssues?.esign;

    return (
      <Modal title={text(t, "kycRejectedTitle", "KYC Rejected")} eyebrow={t.completeKyc} onClose={() => undefined}>
        <div className="notice-card">
          <Lock size={22} />
          <div>
            <strong>{text(t, "kycRejectedMessage", "Review the administrator comments and reapply the requested documents.")}</strong>
            {user.kyc?.rejectionReason && <span>{user.kyc.rejectionReason}</span>}
          </div>
        </div>
        <div className="kyc-issue-list">
          {aadhaarIssue?.selected && (
            <article className="kyc-info-card">
              <h3>{text(t, "aadhaarIssue", "Aadhaar Issue")}</h3>
              <p>{aadhaarIssue.reason || "-"}</p>
            </article>
          )}
          {panIssue?.selected && (
            <article className="kyc-info-card">
              <h3>{text(t, "panIssue", "PAN Issue")}</h3>
              <p>{panIssue.reason || "-"}</p>
            </article>
          )}
          {esignIssue?.selected && (
            <article className="kyc-info-card">
              <h3>{text(t, "esignIssue", "Aadhaar eSign Issue")}</h3>
              <p>{esignIssue.reason || "-"}</p>
            </article>
          )}
          {!aadhaarIssue?.selected && !panIssue?.selected && !esignIssue?.selected && user.kyc?.rejectionReason && (
            <article className="kyc-info-card">
              <h3>{text(t, "rejectionComment", "Rejection Comment")}</h3>
              <p>{user.kyc.rejectionReason}</p>
            </article>
          )}
        </div>
        <button className="primary-button" type="button" onClick={() => setReapplyOpen(true)}>
          <FileCheck2 size={18} />
          {text(t, "reapplyKyc", "Reapply KYC")}
        </button>
      </Modal>
    );
  }

  if (KYC_REVIEW_STATUSES.has(user.kycStatus)) {
    return (
      <Modal title={t.kycPendingTitle} eyebrow={t.completeKyc} onClose={() => undefined}>
        <div className="notice-card">
          <Lock size={22} />
          <div>
            <strong>{t.adminReviewRequired}</strong>
            <span>{t.kycPendingMessage}</span>
          </div>
        </div>
      </Modal>
    );
  }

  async function submitAadhaar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isValidAadhaarValue(aadhaarNumber)) {
      setError(t.invalidAadhaar);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.submitKycAadhaar(normalizeAadhaar(aadhaarNumber));
      onUpdated(response.user);
      setStep(rejectedDocs.pan || !response.user.kyc?.pan?.verifiedAt ? "pan" : "esign");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitEsign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isValidMobileValue(esignPhone)) {
      setError(text(t, "invalidMobile", "Enter a valid 10 digit mobile number."));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.submitKycEsign(esignPhone.replace(/\D/g, ""));
      onUpdated(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isValidPanValue(panNumber)) {
      setError(t.invalidPan);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isPlaceholderPersonName(fullName)) {
        setError("Enter the correct PAN full name.");
        setIsSubmitting(false);
        return;
      }
      const response = await api.submitKycPan({
        panNumber: panNumber.trim().toUpperCase(),
        fullName,
        dob: dobInputToApi(dob)
      });
      onUpdated(response.user);
      setStep("esign");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function continueAfterEsign() {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await api.fetchKycEsignStatus();
      onUpdated(response.user);
      if (!(response.user.kyc?.esign?.signedAt || response.user.kyc?.esign?.status === "verified")) {
        setError(text(t, "esignNotCompleted", "Aadhaar eSign is not completed yet. Click Open Aadhaar eSign, finish signing, then check status."));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={t.completeKyc} eyebrow={t.profile} onClose={() => undefined}>
      <p className="reset-modal-copy">{t.kycRequiredMessage}</p>
      {step === "aadhaar" ? (
        <form className="form-grid" onSubmit={submitAadhaar}>
          <label>
            <span>{t.aadhaarNumber}</span>
            <input
              value={aadhaarNumber}
              onChange={(event) => setAadhaarNumber(event.target.value.replace(/\D/g, "").slice(0, 12))}
              inputMode="numeric"
              maxLength={12}
              required
              disabled={isSubmitting}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="button-loader" /> : <Fingerprint size={18} />}
            {isSubmitting ? t.loading : t.verifyAadhaar}
          </button>
        </form>
      ) : step === "esign" ? (
        <form className="form-grid" onSubmit={submitEsign}>
          <label>
            <span>{t.mobileNumber}</span>
            <input
              value={esignMobileValue}
              onChange={(event) => setEsignPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              required
              disabled={isSubmitting || hasActiveEsignRequest}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          {!hasActiveEsignRequest && (
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <span className="button-loader" /> : <FileCheck2 size={18} />}
              {isSubmitting ? t.loading : text(t, "createAadhaarEsign", "Create Aadhaar eSign")}
            </button>
          )}
          {hasActiveEsignRequest && (
            <KycEsignActionCard source={user.kyc.esign} t={t} onContinue={continueAfterEsign} checking={isSubmitting} />
          )}
        </form>
      ) : (
        <form className="form-grid" onSubmit={submitPan}>
          <label>
            <span>{t.panNumber}</span>
            <input
              value={panNumber}
              onChange={(event) => setPanNumber(event.target.value.toUpperCase().slice(0, 10))}
              maxLength={10}
              required
              disabled={isSubmitting}
            />
          </label>
          <label>
            <span>{t.name}</span>
            <input
              name="panFullName"
              value={fullName}
              onChange={(event) => setFullName(formatPanNameInput(event.target.value))}
              onFocus={() => {
                if (isPlaceholderPersonName(fullName)) {
                  setFullName("");
                }
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              disabled={isSubmitting}
            />
          </label>
          <label>
            <span>{t.dateOfBirth}</span>
            <input
              value={dob}
              onChange={(event) => setDob(formatDobInput(event.target.value))}
              inputMode="numeric"
              maxLength={10}
              placeholder="DD/MM/YYYY"
              required
              disabled={isSubmitting}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="button-loader" /> : <CreditCard size={18} />}
            {isSubmitting ? t.loading : t.verifyPan}
          </button>
        </form>
      )}
    </Modal>
  );
}

function DashboardView({
  language,
  t,
  user,
  metrics,
  loading,
  alerts = [],
  wallet
}: {
  language: Language;
  t: Record<string, string>;
  user: UserAccount;
  metrics: DashboardMetrics | null;
  loading: boolean;
  alerts?: AlertItem[];
  wallet?: WalletSummary | null;
}) {
  const trendValues = metrics?.trend || [];
  const peakVolume = trendValues.length > 0 ? Math.max(...trendValues) : 0;
  const averageVolume = trendValues.length > 0 ? Math.round(trendValues.reduce((sum, value) => sum + value, 0) / trendValues.length) : 0;
  const assignedApiCount =
    user.role === "super_admin"
      ? uniqueApiPricingDocs(publicApiDocs).length
      : uniqueApiPricingDocs(publicApiDocs.filter((apiDoc) => userHasPricingPermission(user, apiDoc.id))).length;
  const walletBalance = wallet?.balance ?? user.walletBalance ?? 0;
  const stats = metrics
    ? [
        { label: t.teamSize, value: metrics.teamSize, caption: t.activeAccounts, icon: Users, tone: "green" },
        { label: t.verificationsRun, value: metrics.verifications, caption: t.allTime, icon: Activity, tone: "violet" },
        { label: t.reportsGenerated, value: metrics.reports, caption: t.allTime, icon: FileCheck2, tone: "orange" },
        ...(user.role === "super_admin"
          ? [{
              label: "JSON TO PDF REPORTS",
              value: (metrics.tuJsonPdfReports ?? 0) + (metrics.experianJsonPdfReports ?? 0),
              caption: `TU: ${metrics.tuJsonPdfReports ?? 0} | Experian: ${metrics.experianJsonPdfReports ?? 0}`,
              icon: FileCheck2,
              tone: "green"
            }]
          : []),
        { label: t.walletBalance, value: formatConnects(walletBalance), caption: text(t, "availableBalance", "Available balance"), icon: IndianRupee, tone: walletBalance < 150 ? "red" : "green", low: walletBalance < 150 },
        { label: text(t, "apiServices", "API SERVICES"), value: assignedApiCount, caption: text(t, "publicApisLive", "Public APIs live"), icon: FileSpreadsheet, tone: "blue" },
        { label: text(t, "monthlyPeak", "MONTHLY PEAK"), value: peakVolume, caption: text(t, "highestVolume", "Highest period volume"), icon: Gauge, tone: "green" },
        { label: text(t, "averageVolume", "AVG VOLUME"), value: averageVolume, caption: text(t, "perPeriodAverage", "Per period average"), icon: Landmark, tone: "slate" }
      ]
    : [];

  return (
    <div className="view-stack dashboard-view">
      <DashboardAlerts alerts={alerts} />
      <section className="stats-grid">
        {!loading && stats.length > 0
          ? stats.map((stat) => <StatCard key={stat.label} language={language} {...stat} />)
          : Array.from({ length: 6 }).map((_, index) => <MetricSkeleton key={index} />)}
      </section>

      <section className="dashboard-grid dashboard-chart-grid">
        <article className="panel trend-panel dashboard-traffic-panel">
          <div className="panel-heading">
            <div>
              <h2>API Traffic</h2>
              <p>Daily call volume by success and failure</p>
            </div>
            <span>{metrics?.trendPeriod || currentTrendPeriod()}</span>
          </div>
          <div className="chart-legend">
            <span><i /> Successful</span>
            <span><i /> Failed</span>
          </div>
          {loading ? <ChartSkeleton /> : <BarTrendChart values={trendValues} labels={metrics?.trendLabels} />}
        </article>
      </section>
    </div>
  );
}

function AlertsView({ alerts, onSaved }: { alerts: AlertItem[]; onSaved: (alerts: AlertItem[]) => void }) {
  const [newAlert, setNewAlert] = useState("");
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertItem | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function persistAlerts(nextAlerts: AlertItem[], busyKey: string) {
    setSavingId(busyKey);
    setMessage("");
    setError("");
    try {
      const saved = await api.updateAlerts(nextAlerts);
      onSaved(saved);
      setMessage("Alerts updated");
    } catch (err) {
      setError(getDisplayError(err, "Unable to update alerts"));
    } finally {
      setSavingId("");
    }
  }

  async function addAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanMessage = newAlert.trim();
    if (!cleanMessage) {
      setError("Enter alert message");
      return;
    }
    const nextAlert: AlertItem = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message: cleanMessage,
      active: true,
      createdAt: new Date().toISOString()
    };
    await persistAlerts([...alerts, nextAlert], "new");
    setNewAlert("");
    setAlertModalOpen(false);
  }

  function openEdit(alert: AlertItem) {
    setEditingAlert(alert);
    setEditMessage(alert.message);
    setEditActive(alert.active);
    setMessage("");
    setError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAlert) return;
    const cleanMessage = editMessage.trim();
    if (!cleanMessage) {
      setError("Enter alert message");
      return;
    }
    const nextAlerts = alerts.map((alert) =>
      alert.id === editingAlert.id ? { ...alert, message: cleanMessage, active: editActive } : alert
    );
    await persistAlerts(nextAlerts, editingAlert.id);
    setEditingAlert(null);
  }

  return (
    <div className="view-stack alerts-view">
      <header className="page-heading">
        <div>
          <p className="eyebrow">- SYSTEM ALERTS</p>
          <h1>Alert</h1>
          <p>These alerts appear on the dashboard only.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => {
          setNewAlert("");
          setAlertModalOpen(true);
          setMessage("");
          setError("");
        }}>
          <Plus size={18} />
          Add Alert
        </button>
      </header>

      <DataPanel>
        {alerts.length === 0 ? (
          <div className="empty-state">
            <Bell size={26} />
            <strong>No alerts added</strong>
            <span>Add an alert when you need to show an important message to all users.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Alert</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="alert-message-cell" data-label="Alert">{alert.message}</td>
                    <td data-label="Status">
                      <button
                        className={alert.active ? "toggle-chip active" : "toggle-chip"}
                        type="button"
                        onClick={() => persistAlerts(alerts.map((item) => (item.id === alert.id ? { ...item, active: !item.active } : item)), alert.id)}
                        disabled={savingId === alert.id}
                      >
                        {alert.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td data-label="Updated">{alert.updatedAt || alert.createdAt ? formatShortDate(alert.updatedAt || alert.createdAt || "", "en") : "-"}</td>
                    <td data-label="Actions">
                      <div className="table-actions">
                        <button className="secondary-button compact-action" type="button" onClick={() => openEdit(alert)} disabled={Boolean(savingId)}>
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button className="secondary-button danger-button compact-action" type="button" onClick={() => persistAlerts(alerts.filter((item) => item.id !== alert.id), alert.id)} disabled={savingId === alert.id}>
                          <X size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
      </DataPanel>

      {alertModalOpen && (
        <Modal title="Add Alert" eyebrow="Alert" onClose={() => setAlertModalOpen(false)}>
          <form className="form-grid" onSubmit={addAlert}>
            <label>
              <span>Message</span>
              <textarea value={newAlert} onChange={(event) => setNewAlert(event.target.value)} rows={4} placeholder="Enter alert message" />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit" disabled={savingId === "new"}>
              {savingId === "new" ? <span className="button-loader" /> : <Plus size={18} />}
              Add Alert
            </button>
          </form>
        </Modal>
      )}

      {editingAlert && (
        <Modal title="Edit Alert" eyebrow="Alert" onClose={() => setEditingAlert(null)}>
          <form className="form-grid" onSubmit={saveEdit}>
            <label>
              <span>Message</span>
              <textarea value={editMessage} onChange={(event) => setEditMessage(event.target.value)} rows={4} />
            </label>
            <label className="inline-check">
              <input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} />
              Active
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit" disabled={savingId === editingAlert.id}>
              {savingId === editingAlert.id ? <span className="button-loader" /> : <Save size={18} />}
              Update Alert
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function DashboardAlerts({ alerts }: { alerts: AlertItem[] }) {
  const activeAlerts = alerts.filter((alert) => alert.active && alert.message.trim());
  if (activeAlerts.length === 0) return null;

  return (
    <section className="dashboard-alert-stack" aria-live="polite">
      {activeAlerts.map((alert) => (
        <div className="dashboard-alert" key={alert.id}>
          <Bell size={16} />
          <span>{alert.message}</span>
        </div>
      ))}
    </section>
  );
}

const bureauServiceDescriptions: Partial<Record<ServiceKind, string>> = {
  cibil: "Get a TransUnion bureau PDF report with instant delivery and secure processing.",
  "cibil-json": "Get a TransUnion bureau JSON report for direct system consumption.",
  "tu-json-to-pdf": "Convert an authorized TransUnion JSON response into a structured CIBIL PDF report.",
  "equifax-cibil": "Get an Equifax bureau PDF report with customer credit details.",
  "equifax-cibil-json": "Get an Equifax bureau JSON report for automated workflows.",
  crif: "Get a CRIF bureau PDF report using customer mobile details.",
  "crif-json": "Get a CRIF bureau JSON report for API based processing."
  ,"experian-json": "Fetch the complete Experian bureau response in JSON format."
  ,"experian-pdf": "Fetch Experian bureau data and generate a structured Experian PDF report."
  ,prefill: "Fetch bureau identity, contact, address, PAN and demographic prefill data."
};

const verificationServiceDescriptions: Partial<Record<ServiceKind, string>> = {
  pan: "Fetch full PAN details using PAN number and explicit consent.",
  "aadhaar-validation": "Validate whether an Aadhaar number is active and valid.",
  "aadhaar-otp": "Generate and verify Aadhaar OTP to fetch Aadhaar details.",
  "uan-fetch-by-pan": "Fetch UAN number linked with an individual PAN number.",
  "uan-profile-details": "Fetch employment-linked profile data using a UAN.",
  "employment-history": "Fetch employment history details using a UAN number.",
  "epfo-passbook": "Fetch latest EPFO passbook details using mobile number and PAN.",
  "driving-license": "Verify driving license details using license number and date of birth.",
  "rc-basic": "Fetch basic vehicle registration, owner, insurance and vehicle details using an RC number."
  ,"mca-company": "Fetch MCA company information, registration details, directors and charges using CIN."
};

const incomeServiceDescriptions: Partial<Record<ServiceKind, string>> = {
  "gstin-verification": "Verify GST registration details, taxpayer status, business name, and filing information.",
  "bank-verification": "Verify bank account existence and beneficiary name using account number and IFSC."
};

function ApiServicesView({
  t,
  mode,
  bureauServices,
  verificationServices,
  incomeServices,
  esignServices,
  canRunService,
  onNavigate
}: {
  t: Record<string, string>;
  mode: "all" | "bureau" | "verification" | "income" | "esign";
  bureauServices: ServiceKind[];
  verificationServices: ServiceKind[];
  incomeServices: ServiceKind[];
  esignServices: ServiceKind[];
  canRunService: (service: ServiceKind) => boolean;
  onNavigate: (view: View) => void;
}) {
  const renderServiceCards = (services: ServiceKind[], descriptions: Partial<Record<ServiceKind, string>>) => (
    <div className="bureau-card-grid">
      {services.map((service) => {
        const Icon = serviceConfig[service].icon;
        const locked = !canRunService(service);
        return (
          <article className={locked ? "bureau-card locked" : "bureau-card"} key={service}>
            <div className="bureau-card-accent" />
            <div className="bureau-card-icon">
              <Icon size={24} />
            </div>
            <h2>{text(t, serviceConfig[service].key, serviceConfig[service].key)}</h2>
            <p className="bureau-delivery">Instant Delivery</p>
            <p>{descriptions[service] || "Generate verification instantly with secure processing."}</p>
            <button className="primary-button bureau-get-button" type="button" onClick={() => !locked && onNavigate(service)} disabled={locked}>
              {locked ? text(t, "permissionRequired", "Permission required") : "Get"}
              {!locked && <ArrowRight size={17} />}
            </button>
            <small>Secure and confidential</small>
          </article>
        );
      })}
    </div>
  );
  const showBureau = (mode === "all" || mode === "bureau") && bureauServices.length > 0;
  const showVerification = (mode === "all" || mode === "verification") && verificationServices.length > 0;
  const showIncome = (mode === "all" || mode === "income") && incomeServices.length > 0;
  const showEsign = (mode === "all" || mode === "esign") && esignServices.length > 0;
  const heading = mode === "esign" ? "eSign" : mode === "income" ? "Income" : mode === "verification" ? "Verification" : mode === "bureau" ? "Bureau" : "API Services";

  return (
    <div className="view-stack api-services-view bureau-view">
      <section className="page-heading">
        <div>
          <p className="eyebrow">- {text(t, "apiServices", "API Services")}</p>
          <h1>{heading}</h1>
        </div>
      </section>
      {showBureau && (
        <section className="service-card-section">
          <p className="eyebrow">- Bureau</p>
          <h2>Bureau</h2>
          {renderServiceCards(bureauServices, bureauServiceDescriptions)}
        </section>
      )}
      {showVerification && (
        <section className="service-card-section">
          <p className="eyebrow">- Verification</p>
          <h2>Verification</h2>
          {renderServiceCards(verificationServices, verificationServiceDescriptions)}
        </section>
      )}
      {showIncome && (
        <section className="service-card-section">
          <p className="eyebrow">- Income</p>
          <h2>Income</h2>
          {renderServiceCards(incomeServices, incomeServiceDescriptions)}
        </section>
      )}
      {showEsign && (
        <section className="service-card-section">
          <p className="eyebrow">- eSign</p>
          <h2>eSign</h2>
          {renderServiceCards(esignServices, {
            esign: "Create Aadhaar based eSign requests and track signing status.",
            econsent: "Create Aadhaar e-Consent sessions and download signed documents."
          })}
        </section>
      )}
    </div>
  );
}

function esignSignedProgress(source: unknown) {
  const signed = esignSourceValue(source, ["signed_count", "signedCount"]);
  const total = esignSourceValue(source, ["total_recipients", "totalRecipients"]);
  if (signed || total) return `${signed || "0"} / ${total || "-"}`;
  return "-";
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50];

function usePaginatedItems<T>(key: string, items: T[]) {
  const storageKey = `dhaara-page-size:${key}`;
  const [pageSize, setPageSizeState] = useState(() => {
    const saved = Number(localStorage.getItem(storageKey) || 10);
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 10;
  });
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const start = (page - 1) * pageSize;

  useEffect(() => {
    setPage(1);
  }, [key, pageSize, items.length]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function setPageSize(nextSize: number) {
    const safeSize = PAGE_SIZE_OPTIONS.includes(nextSize) ? nextSize : 10;
    localStorage.setItem(storageKey, String(safeSize));
    setPageSizeState(safeSize);
  }

  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageCount,
    pageSize,
    setPage,
    setPageSize
  };
}

function useServerPagination<T>(key: string, total: number) {
  const storageKey = `dhaara-page-size:${key}`;
  const [pageSize, setPageSizeState] = useState(() => {
    const saved = Number(localStorage.getItem(storageKey) || 10);
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 10;
  });
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [key, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function setPageSize(nextSize: number) {
    const safeSize = PAGE_SIZE_OPTIONS.includes(nextSize) ? nextSize : 10;
    localStorage.setItem(storageKey, String(safeSize));
    setPageSizeState(safeSize);
  }

  return {
    items: [] as T[],
    total,
    page,
    pageCount,
    pageSize,
    setPage,
    setPageSize
  };
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debounced;
}

function PaginationControls<T>({
  pagination,
  t
}: {
  pagination: ReturnType<typeof usePaginatedItems<T>>;
  t: Record<string, string>;
}) {
  if (pagination.total <= 0) return null;

  return (
    <div className="pagination-bar">
      <label className="page-size-picker" title={text(t, "rowsPerPage", "Rows per Page")}>
        <select value={pagination.pageSize} onChange={(event) => pagination.setPageSize(Number(event.target.value))}>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <ChevronRight size={16} />
      </label>
      <div className="pagination-actions">
        <button
          type="button"
          className="icon-button pagination-icon pagination-edge"
          onClick={() => pagination.setPage(1)}
          disabled={pagination.page <= 1}
          aria-label={text(t, "firstPage", "First Page")}
          title={text(t, "firstPage", "First Page")}
        >
          {"<<"}
        </button>
        <button
          type="button"
          className="icon-button pagination-icon"
          onClick={() => pagination.setPage(Math.max(1, pagination.page - 1))}
          disabled={pagination.page <= 1}
          aria-label={text(t, "previous", "Previous")}
          title={text(t, "previous", "Previous")}
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          {text(t, "page", "Page")} {pagination.page} {text(t, "of", "of")} {pagination.pageCount}
        </span>
        <button
          type="button"
          className="icon-button pagination-icon"
          onClick={() => pagination.setPage(Math.min(pagination.pageCount, pagination.page + 1))}
          disabled={pagination.page >= pagination.pageCount}
          aria-label={text(t, "next", "Next")}
          title={text(t, "next", "Next")}
        >
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="icon-button pagination-icon pagination-edge"
          onClick={() => pagination.setPage(pagination.pageCount)}
          disabled={pagination.page >= pagination.pageCount}
          aria-label={text(t, "lastPage", "Last Page")}
          title={text(t, "lastPage", "Last Page")}
        >
          {">>"}
        </button>
      </div>
    </div>
  );
}

function ListSearch({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="list-search">
      <Search size={18} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function UserManagementView({
  language,
  t,
  user,
  users,
  invites,
  plans,
  loading,
  onChanged
}: {
  language: Language;
  t: Record<string, string>;
  user: UserAccount;
  users: UserAccount[];
  invites: Invite[];
  plans: Plan[];
  loading: boolean;
  onChanged: () => void;
}) {
  const allowedRoles = inviteMatrix[user.role];
  const [inviteOpen, setInviteOpen] = useState(false);
  const [kycFilter, setKycFilter] = useState<"all" | "verified" | "unverified">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "not_active" | "blocked">("all");
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [permissionUser, setPermissionUser] = useState<UserAccount | null>(null);
  const [statusConfirmUser, setStatusConfirmUser] = useState<UserAccount | null>(null);
  const [statusChangingUserId, setStatusChangingUserId] = useState("");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserAccount | null>(null);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const debouncedUserSearch = useDebouncedValue(userSearchQuery, 300);
  const [serverUsers, setServerUsers] = useState<UserAccount[]>(users);
  const [userTotal, setUserTotal] = useState(users.length);
  const [usersLoading, setUsersLoading] = useState(loading);
  const [usersReloadKey, setUsersReloadKey] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const userPagination = useServerPagination<UserAccount>(
    `users:${user.id}:${kycFilter}:${statusFilter}:${debouncedUserSearch}`,
    userTotal
  );

  useEffect(() => {
    let mounted = true;
    setUsersLoading(true);
    api.usersPage({
      page: userPagination.page,
      limit: userPagination.pageSize,
      search: debouncedUserSearch,
      kyc: user.role === "super_admin" ? kycFilter : "all",
      status: statusFilter
    })
      .then((response) => {
        if (mounted) {
          setServerUsers(response.items);
          setUserTotal(response.pagination.total);
        }
      })
      .catch((err) => {
        if (mounted) {
          setServerUsers([]);
          setUserTotal(0);
          setError(getDisplayError(err, t.error));
        }
      })
      .finally(() => {
        if (mounted) setUsersLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [debouncedUserSearch, kycFilter, statusFilter, user.id, user.role, userPagination.page, userPagination.pageSize, usersReloadKey]);

  const filteredUsers = serverUsers;
  const canManagePermissions = userHasPermission(user, "roles.assign");
  const hasRowActions = user.role !== "user" || canManagePermissions;

  async function confirmStatusChange() {
    if (!statusConfirmUser) return;
    const member = statusConfirmUser;
    setStatusChangingUserId(member.id);
    setMessage("");
    setError("");
    try {
      const response = await api.updateUserStatus(member.id, member.status === "suspended" ? "active" : "suspended");
      const updatedMember = response.user;
      setServerUsers((current) => current.map((account) => account.id === member.id ? updatedMember : account));
      setMessage(member.status === "suspended" ? t.accountUnblocked : t.accountBlocked);
      setStatusConfirmUser(null);
      setUsersReloadKey((key) => key + 1);
      onChanged();
    } catch (err) {
      setError(getDisplayError(err, t.error));
    } finally {
      setStatusChangingUserId("");
    }
  }

  async function confirmDeleteUser() {
    if (!deleteConfirmUser) return;
    const member = deleteConfirmUser;
    setDeletingUserId(member.id);
    setMessage("");
    setError("");
    try {
      await api.deleteUser(member.id);
      setServerUsers((current) => current.filter((account) => account.id !== member.id));
      setUserTotal((current) => Math.max(0, current - 1));
      setDeleteConfirmUser(null);
      setMessage("Account deleted successfully.");
      setUsersReloadKey((key) => key + 1);
      onChanged();
    } catch (err) {
      setError(getDisplayError(err, t.error));
    } finally {
      setDeletingUserId("");
    }
  }

  return (
    <div className="view-stack">
      <section className="page-heading page-heading-compact">
        <div>
          <p className="eyebrow">- {t.userManagement}</p>
          <h1>{t.members}</h1>
        </div>
        {allowedRoles.length > 0 && (
          <button className="primary-button" type="button" onClick={() => setInviteOpen(true)}>
            <Plus size={18} />
            {t.inviteTeamMember}
          </button>
        )}
      </section>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <DataPanel
        action={<ListSearch value={userSearchQuery} onChange={setUserSearchQuery} placeholder={t.searchUsers} />}
        footer={!usersLoading ? <PaginationControls pagination={userPagination} t={t} /> : null}
      >
        {usersLoading ? (
          <TableSkeleton rows={5} />
        ) : (
          <div className="user-management-stack">
            <div className="table-wrap">
              <table className={user.role === "super_admin" ? "users-table users-table-admin" : `users-table users-table-${user.role}`}>
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.email}</th>
                    <th>{t.role}</th>
                    {user.role !== "sub_agent" && <th>{t.invitedBy}</th>}
                    <th style={{ width: "160px", minWidth: "160px", paddingRight: "24px" }}>
                      <select
                        aria-label="Filter users by status"
                        title="Filter users by status"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "not_active" | "blocked")}
                        onClick={(event) => event.stopPropagation()}
                        style={{
                          width: "124px",
                          minWidth: 0,
                          maxWidth: "124px",
                          boxSizing: "border-box",
                          height: "38px",
                          border: "1px solid var(--line, #d6e0eb)",
                          borderRadius: "999px",
                          background: "var(--surface, #fff)",
                          color: "var(--ink, #10233e)",
                          font: "inherit",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          letterSpacing: "0.01em",
                          padding: "0 28px 0 12px",
                          cursor: "pointer"
                        }}
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="not_active">Not Active</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </th>
                    {hasRowActions && <th style={{ minWidth: "190px", paddingLeft: "20px" }}>{t.actions}</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4 + (user.role !== "sub_agent" ? 1 : 0) + (hasRowActions ? 1 : 0)}>
                        <div className="empty-state">{debouncedUserSearch.trim() ? t.noSearchResults : t.noData}</div>
                      </td>
                    </tr>
                  )}
                  {filteredUsers.map((member) => (
                    <tr className="clickable-row" key={member.id} onClick={() => setSelectedUser(member)}>
                      <td data-label={t.name}>{member.name}</td>
                      <td data-label={t.email}>{member.email}</td>
                      <td data-label={t.role}>{roleLabels[language][member.role]}</td>
                      {user.role !== "sub_agent" && (
                        <td data-label={t.invitedBy}>
                          {member.invitedByName ? (
                            <span className="stacked-cell">
                              <strong>{member.invitedByName}</strong>
                              <small>{member.invitedByEmail}</small>
                            </span>
                          ) : (
                            t.notInvited
                          )}
                        </td>
                      )}
                      <td data-label={t.status}>{statusLabel(member.status, t)}</td>
                      {hasRowActions && (
                        <td data-label={t.actions} onClick={(event) => event.stopPropagation()}>
                          <div className="row-actions">
                            {canEditPermissionsForMember(user, member) && (
                              <button className="secondary-button compact-action" type="button" onClick={() => setPermissionUser(member)}>
                                <ShieldCheck size={15} />
                                {text(t, "editPermissions", "Edit Permissions")}
                              </button>
                            )}
                            {canManageAccountForMember(user, member) && (
                              <button
                                className="secondary-button danger-button compact-action"
                                type="button"
                                onClick={() => setStatusConfirmUser(member)}
                                disabled={statusChangingUserId === member.id}
                              >
                                {statusChangingUserId === member.id ? <span className="button-loader dark" /> : <Ban size={15} />}
                                {member.status === "suspended" ? t.unblockAccount : t.blockAccount}
                              </button>
                            )}
                            {user.role === "super_admin" && member.role !== "super_admin" && (
                              <button
                                className="secondary-button danger-button compact-action"
                                type="button"
                                onClick={() => setDeleteConfirmUser(member)}
                                disabled={deletingUserId === member.id}
                              >
                                {deletingUserId === member.id ? <span className="button-loader dark" /> : <Trash2 size={15} />}
                                Delete Account
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DataPanel>
      {deleteConfirmUser && (
        <Modal
          title="Delete Account"
          eyebrow={deleteConfirmUser.name}
          onClose={() => {
            if (!deletingUserId) setDeleteConfirmUser(null);
          }}
        >
          <div className="form-grid">
            <article className="kyc-info-card api-token-card">
              <div className="user-plan-head">
                <h3>{text(t, "walletBalance", "Wallet Balance")}</h3>
                <Badge tone="muted">Soft Delete</Badge>
              </div>
              <code>{formatConnects(deleteConfirmUser.walletBalance || 0)}</code>
            </article>
            <p className="date-line">
              This account will disappear from user management and wallet views. Panel login and public API access will stop, while historical records remain available in reports.
            </p>
            <div className="profile-edit-actions">
              <button className="secondary-button" type="button" onClick={() => setDeleteConfirmUser(null)} disabled={Boolean(deletingUserId)}>
                <X size={17} />
                {t.cancel}
              </button>
              <button className="primary-button danger-button" type="button" onClick={confirmDeleteUser} disabled={Boolean(deletingUserId)}>
                {deletingUserId ? <span className="button-loader" /> : <Trash2 size={17} />}
                {deletingUserId ? t.loading : "Confirm Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {statusConfirmUser && (
        <Modal
          title={statusConfirmUser.status === "suspended" ? t.unblockAccount : t.blockAccount}
          eyebrow={statusConfirmUser.name}
          onClose={() => {
            if (!statusChangingUserId) setStatusConfirmUser(null);
          }}
        >
          <div className="form-grid">
            <article className="kyc-info-card api-token-card">
              <div className="user-plan-head">
                <h3>{text(t, "walletBalance", "Wallet Balance")}</h3>
                <Badge tone={statusConfirmUser.status === "suspended" ? "success" : "muted"}>
                  {statusConfirmUser.status === "suspended" ? t.unblockAccount : t.blockAccount}
                </Badge>
              </div>
              <code>{formatConnects(statusConfirmUser.walletBalance || 0)}</code>
            </article>

            {statusConfirmUser.status === "suspended" && (
              <article className="kyc-info-card user-permissions-card">
                <div className="user-plan-head">
                  <h3>{t.permissions}</h3>
                  {canEditPermissionsForMember(user, statusConfirmUser) && (
                    <button
                      className="secondary-button compact-action"
                      type="button"
                      onClick={() => {
                        setPermissionUser(statusConfirmUser);
                        setStatusConfirmUser(null);
                      }}
                    >
                      <ShieldCheck size={15} />
                      {text(t, "editPermissions", "Edit Permissions")}
                    </button>
                  )}
                </div>
                <p>
                  {statusConfirmUser.permissions.length.toLocaleString(language === "hi" ? "hi-IN" : "en-IN")} {t.selected}
                </p>
                <div className="permission-summary-chips">
                  {statusConfirmUser.permissions.slice(0, 10).map((permission) => (
                    <span key={permission}>
                      {permissionText[language][permission as PermissionId]?.title || permission}
                    </span>
                  ))}
                  {statusConfirmUser.permissions.length > 10 && <span>+{statusConfirmUser.permissions.length - 10}</span>}
                </div>
                <p className="date-line">
                  A new email will be sent to this user. If public API access is assigned, a new API token will be generated and included.
                </p>
              </article>
            )}

            {statusConfirmUser.status !== "suspended" && (
              <p className="date-line">
                This will stop panel login, revoke active sessions, and block public API usage for this account.
              </p>
            )}

            <div className="profile-edit-actions">
              <button className="secondary-button" type="button" onClick={() => setStatusConfirmUser(null)} disabled={Boolean(statusChangingUserId)}>
                <X size={17} />
                {t.cancel}
              </button>
              <button className="primary-button" type="button" onClick={confirmStatusChange} disabled={Boolean(statusChangingUserId)}>
                {statusChangingUserId ? <span className="button-loader" /> : <Ban size={17} />}
                {statusChangingUserId ? t.loading : statusConfirmUser.status === "suspended" ? t.unblockAccount : t.blockAccount}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {selectedUser && (
        <KycDetailModal
          language={language}
          t={t}
          member={selectedUser}
          canReview={user.role === "super_admin"}
          canManageAccount={canManageAccountForMember(user, selectedUser)}
          canEditPermissions={canEditPermissionsForMember(user, selectedUser)}
          onEditPermissions={() => {
            setPermissionUser(selectedUser);
            setSelectedUser(null);
          }}
          onMemberUpdated={(updatedMember) => {
            setSelectedUser(updatedMember);
            setServerUsers((current) => current.map((member) => member.id === updatedMember.id ? updatedMember : member));
          }}
          onClose={() => setSelectedUser(null)}
          onChanged={() => {
            setSelectedUser(null);
            onChanged();
          }}
        />
      )}
      {permissionUser && (
        <PermissionEditModal
          language={language}
          t={t}
          actor={user}
          member={permissionUser}
          onClose={() => setPermissionUser(null)}
          onSaved={() => {
            setPermissionUser(null);
            setMessage(text(t, "permissionsSaved", "Permissions updated successfully."));
            setUsersReloadKey((key) => key + 1);
            onChanged();
          }}
        />
      )}
      {inviteOpen && (
        <InviteModal
          language={language}
          t={t}
          actor={user}
          allowedRoles={allowedRoles}
          onClose={() => setInviteOpen(false)}
          onCreated={() => {
            setInviteOpen(false);
            setMessage(t.inviteSent);
            userPagination.setPage(1);
            setUsersReloadKey((key) => key + 1);
            onChanged();
          }}
        />
      )}
    </div>
  );
}


function ContactView({ t, user }: { t: Record<string, string>; user: UserAccount }) {
  const [salesEmail, setSalesEmail] = useState("sales@Finrep.in");
  const [supportEmail, setSupportEmail] = useState("support@Finrep.in");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api.contactEmails()
      .then((emails) => {
        if (!mounted) return;
        setSalesEmail(emails.salesEmail);
        setSupportEmail(emails.supportEmail);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  async function saveEmails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const emails = await api.updateContactEmails({ salesEmail, supportEmail });
      setSalesEmail(emails.salesEmail);
      setSupportEmail(emails.supportEmail);
      setEditing(false);
      setMessage(text(t, "contactEmailsSaved", "Contact emails updated."));
    } catch (err) {
      setError(getDisplayError(err, t.error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view-stack">
      <section className="page-heading page-heading-compact">
        <div>
          <p className="eyebrow">- Finrep</p>
          <h1>{t.contactUs}</h1>
          <p className="date-line">{t.contactIntro}</p>
        </div>
        {user.role === "super_admin" && !editing && (
          <button className="secondary-button" type="button" onClick={() => setEditing(true)}>
            <Pencil size={17} />
            {text(t, "edit", "Edit")}
          </button>
        )}
      </section>
      {editing ? (
        <form className="panel form-grid contact-edit-panel" onSubmit={saveEmails}>
          <label>
            <span>{t.contactSales}</span>
            <input value={salesEmail} onChange={(event) => setSalesEmail(event.target.value)} type="email" required />
          </label>
          <label>
            <span>{t.contactSupport}</span>
            <input value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} type="email" required />
          </label>
          {message && <p className="form-success">{message}</p>}
          {error && <p className="form-error">{error}</p>}
          <div className="profile-edit-actions">
            <button className="secondary-button" type="button" onClick={() => setEditing(false)} disabled={saving}>
              <X size={17} />
              {t.cancel}
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <span className="button-loader" /> : <Save size={17} />}
              {saving ? t.loading : t.save}
            </button>
          </div>
        </form>
      ) : (
        <section className="contact-grid">
          <a className="contact-card" href={`mailto:${salesEmail}`}>
            <span><Mail size={23} /></span>
            <strong>{t.contactSales}</strong>
            <small>{salesEmail}</small>
          </a>
          <a className="contact-card" href={`mailto:${supportEmail}`}>
            <span><MessageCircle size={23} /></span>
            <strong>{t.contactSupport}</strong>
            <small>{supportEmail}</small>
          </a>
        </section>
      )}
      {!editing && message && <p className="form-success">{message}</p>}
      {!editing && error && <p className="form-error">{error}</p>}
    </div>
  );
}

function KycDetailModal({
  language,
  t,
  member,
  canReview,
  canManageAccount,
  canEditPermissions,
  onEditPermissions,
  onMemberUpdated,
  onClose,
  onChanged
}: {
  language: Language;
  t: Record<string, string>;
  member: UserAccount;
  canReview: boolean;
  canManageAccount: boolean;
  canEditPermissions: boolean;
  onEditPermissions: () => void;
  onMemberUpdated?: (member: UserAccount) => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [currentMember, setCurrentMember] = useState(member);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchingEsignStatus, setFetchingEsignStatus] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [aadhaarIssue, setAadhaarIssue] = useState(false);
  const [panIssue, setPanIssue] = useState(false);
  const [esignIssue, setEsignIssue] = useState(false);
  const [aadhaarReason, setAadhaarReason] = useState("");
  const [panReason, setPanReason] = useState("");
  const [esignReason, setEsignReason] = useState("");
  const [error, setError] = useState("");
  const rejectPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentMember(member);
  }, [member]);

  useEffect(() => {
    if (!rejecting) return;
    requestAnimationFrame(() => {
      rejectPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [rejecting]);

  async function review(action: "approve" | "reject") {
    setIsSubmitting(true);
    setError("");
    try {
      if (action === "approve") {
        await api.approveKyc(member.id);
      } else {
        await api.rejectKyc(member.id, {
          issues: {
            aadhaar: { selected: aadhaarIssue, reason: aadhaarReason },
            pan: { selected: panIssue, reason: panReason },
            esign: { selected: esignIssue, reason: esignReason }
          }
        });
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function fetchMemberEsignStatus() {
    if (fetchingEsignStatus) return;

    setFetchingEsignStatus(true);
    setError("");
    try {
      const response = await api.fetchUserKycEsignStatus(currentMember.id);
      const updatedMember = {
        ...currentMember,
        kycStatus: response.kycStatus,
        kyc: response.kyc
      };
      setCurrentMember(updatedMember);
      onMemberUpdated?.(updatedMember);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setFetchingEsignStatus(false);
    }
  }

  async function submitMemberPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordSaving) return;

    if (!isStrongPasswordValue(newMemberPassword)) {
      setPasswordError(t.passwordMinimum);
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");
    setPasswordMessage("");
    try {
      const response = await api.updateUserPassword(currentMember.id, newMemberPassword);
      setCurrentMember(response.user);
      onMemberUpdated?.(response.user);
      setNewMemberPassword("");
      setPasswordModalOpen(false);
      setPasswordMessage(text(t, "passwordUpdated", "Password updated."));
    } catch (err) {
      setPasswordError(getDisplayError(err, t.error));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <>
    <Modal title={text(t, "userDetails", "User Details")} eyebrow={currentMember.name} onClose={onClose}>
      <article className="kyc-info-card">
        <h3>{text(t, "accountDetails", "Account Details")}</h3>
        <dl className="profile-list">
          <div>
            <dt>{t.name}</dt>
            <dd>{currentMember.name}</dd>
          </div>
          <div>
            <dt>{t.email}</dt>
            <dd>{currentMember.email}</dd>
          </div>
          <div>
            <dt>{text(t, "contact", "Contact")}</dt>
            <dd>{currentMember.contact || "-"}</dd>
          </div>
          <div>
            <dt>{text(t, "roadStreet", "Road / Street")}</dt>
            <dd>{currentMember.roadStreet || "-"}</dd>
          </div>
          <div>
            <dt>{text(t, "state", "State")}</dt>
            <dd>{currentMember.stateCode || "-"}</dd>
          </div>
          <div>
            <dt>{text(t, "pincode", "Pincode")}</dt>
            <dd>{currentMember.pincode || "-"}</dd>
          </div>
          <div>
            <dt>GSTIN</dt>
            <dd>{currentMember.gstin || "-"}</dd>
          </div>
          <div>
            <dt>PAN</dt>
            <dd>{currentMember.pan || "-"}</dd>
          </div>
          <div>
            <dt>{t.role}</dt>
            <dd>{roleLabels[language][currentMember.role]}</dd>
          </div>
          <div>
            <dt>{t.status}</dt>
            <dd>{statusLabel(currentMember.status, t)}</dd>
          </div>
          <div>
            <dt>{t.invitedBy}</dt>
            <dd>{currentMember.invitedByName ? `${currentMember.invitedByName} - ${currentMember.invitedByEmail}` : t.notInvited}</dd>
          </div>
        </dl>
      </article>
      {canManageAccount && currentMember.publicApiToken && userHasAnyApiPermission(currentMember) && (
        <article className="kyc-info-card api-token-card">
          <div className="user-plan-head">
            <h3>{text(t, "apiToken", "API Token")}</h3>
            <Badge tone="success">x-api-token</Badge>
          </div>
          <code>{currentMember.publicApiToken}</code>
          <p>{text(t, "apiTokenHint", "Share this token with the customer only if API access is enabled for their account.")}</p>
        </article>
      )}
      {canManageAccount && (
        <article className="kyc-info-card api-token-card">
          <div className="user-plan-head">
            <h3>{text(t, "loginPassword", "Login Password")}</h3>
            <Badge tone={currentMember.issuedPassword ? "success" : "muted"}>{currentMember.issuedPassword ? text(t, "stored", "Stored") : text(t, "notStored", "Not Stored")}</Badge>
          </div>
          <code>{currentMember.issuedPassword || text(t, "passwordNotStored", "Password is not stored for this older account.")}</code>
          <button
            className="secondary-button compact-action"
            type="button"
            onClick={() => {
              setPasswordModalOpen(true);
              setNewMemberPassword("");
              setPasswordError("");
              setPasswordMessage("");
            }}
          >
            <Lock size={15} />
            {text(t, "changePassword", "Change Password")}
          </button>
          {passwordMessage && <p className="form-success">{passwordMessage}</p>}
        </article>
      )}
      {canEditPermissions && (
        <article className="kyc-info-card user-permissions-card">
          <div className="user-plan-head">
            <h3>{t.permissions}</h3>
            <button className="secondary-button compact-action" type="button" onClick={onEditPermissions}>
              <ShieldCheck size={15} />
              {text(t, "editPermissions", "Edit Permissions")}
            </button>
          </div>
          <p>
            {currentMember.permissions.length.toLocaleString(language === "hi" ? "hi-IN" : "en-IN")} {t.selected}
          </p>
        </article>
      )}
      {error && <p className="form-error">{error}</p>}
    </Modal>
    {passwordModalOpen && (
      <Modal
        title={text(t, "changePassword", "Change Password")}
        eyebrow={currentMember.name}
        onClose={() => {
          setPasswordModalOpen(false);
          setNewMemberPassword("");
          setPasswordError("");
        }}
      >
        <form className="form-grid" onSubmit={submitMemberPassword}>
          <label>
            <span>{text(t, "newPassword", "New Password")}</span>
            <PasswordField
              value={newMemberPassword}
              onChange={setNewMemberPassword}
              required
              autoComplete="new-password"
            />
            <PasswordChecklist password={newMemberPassword} t={t} />
          </label>
          {passwordError && <p className="form-error">{passwordError}</p>}
          <button className="primary-button" type="submit" disabled={passwordSaving}>
            {passwordSaving ? <span className="button-loader" /> : <Save size={18} />}
            {passwordSaving ? t.loading : text(t, "updatePassword", "Update Password")}
          </button>
        </form>
      </Modal>
    )}
    </>
  );
}

function InviteModal({
  language,
  t,
  actor,
  allowedRoles,
  onClose,
  onCreated
}: {
  language: Language;
  t: Record<string, string>;
  actor: UserAccount;
  allowedRoles: Role[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roadStreet, setRoadStreet] = useState("");
  const [pincode, setPincode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [targetRole, setTargetRole] = useState<Role>(allowedRoles[0] || "user");
  const availablePermissionIds = useMemo(() => assignablePermissionsFor(actor, targetRole), [actor, targetRole]);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionId[]>(() => assignablePermissionsFor(actor, targetRole));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submitLock = useRef(false);

  useEffect(() => {
    setSelectedPermissions(availablePermissionIds);
  }, [availablePermissionIds]);

  function togglePermission(permission: PermissionId) {
    setSelectedPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    );
  }

  function selectPermissionGroup(permissions: PermissionId[]) {
    setSelectedPermissions((current) => Array.from(new Set([...current, ...permissions])));
  }

  function clearPermissionGroup(permissions: PermissionId[]) {
    setSelectedPermissions((current) => current.filter((permission) => !permissions.includes(permission)));
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;

    if (!isStrongPasswordValue(password)) {
      setError(t.passwordMinimum);
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      await api.createInvite({
        targetRole,
        name,
        email,
        password,
        permissions: selectedPermissions,
        roadStreet,
        pincode,
        stateCode,
        gstin,
        pan,
        contact
      });
      onCreated();
    } catch (err) {
      setError(getDisplayError(err, t.error));
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={t.inviteTeamMember} eyebrow={t.userManagement} onClose={onClose}>
      <form className="form-grid" onSubmit={submitInvite}>
        <label>
          <span>{t.name}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required disabled={isSubmitting} />
        </label>
        <label>
          <span>{t.email}</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required disabled={isSubmitting} />
        </label>
        <label>
          <span>{text(t, "contact", "Contact")}</span>
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            inputMode="tel"
            maxLength={20}
            placeholder="+91 99999 99999"
            disabled={isSubmitting}
          />
        </label>
        <label>
          <span>{text(t, "roadStreet", "Road / Street")}</span>
          <input value={roadStreet} onChange={(event) => setRoadStreet(event.target.value)} disabled={isSubmitting} />
        </label>
        <label>
          <span>{text(t, "state", "State")}</span>
          <select value={stateCode} onChange={(event) => setStateCode(event.target.value)} disabled={isSubmitting}>
            <option value="">{text(t, "state", "State")}</option>
            {indianStateOptions.map((state) => (
              <option value={state.code} key={state.code}>
                {state.name} ({state.code})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{text(t, "pincode", "Pincode")}</span>
          <input
            value={pincode}
            onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            disabled={isSubmitting}
          />
        </label>
        <label>
          <span>GSTIN</span>
          <input value={gstin} onChange={(event) => setGstin(event.target.value.toUpperCase().slice(0, 15))} maxLength={15} disabled={isSubmitting} />
        </label>
        <label>
          <span>PAN</span>
          <input value={pan} onChange={(event) => setPan(event.target.value.toUpperCase().slice(0, 10))} maxLength={10} disabled={isSubmitting} />
        </label>
        <label>
          <span>{t.password}</span>
          <PasswordField
            value={password}
            onChange={setPassword}
            required
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          <PasswordChecklist password={password} t={t} />
        </label>
        <div className="field-block">
          <span className="field-label">{t.chooseRole}</span>
          <div className="role-picker" role="radiogroup" aria-label={t.chooseRole}>
            {allowedRoles.map((role) => {
              const isSelected = targetRole === role;
              return (
                <button
                  className={`role-option${isSelected ? " active" : ""}`}
                  type="button"
                  key={role}
                  onClick={() => setTargetRole(role)}
                  aria-pressed={isSelected}
                  disabled={isSubmitting}
                >
                  <span className="role-option-icon">
                    <UserPlus size={17} />
                  </span>
                  <span>
                    <strong>{roleLabels[language][role]}</strong>
                    <small>
                      {assignablePermissionsFor(actor, role).length} {t.permissions}
                    </small>
                  </span>
                  {isSelected && <CheckCircle2 size={18} />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="field-block">
          <div className="permission-hero">
            <span>
              <Shield size={19} />
            </span>
            <div>
              <strong>{t.permissions}</strong>
              <small>
                {selectedPermissions.length} {t.selected}
              </small>
            </div>
          </div>
          <div className="permission-groups">
            {permissionGroups.map((group) => {
              const availablePermissions = group.permissions.filter((permission) => availablePermissionIds.includes(permission));
              if (availablePermissions.length === 0) return null;
              const Icon = group.icon;
              return (
                <section className="permission-group" key={group.group}>
                  <div className="permission-group-head">
                    <Icon size={16} />
                    <strong>{group.group}</strong>
                    <div className="permission-actions section-actions">
                      <button type="button" onClick={() => selectPermissionGroup(availablePermissions)} disabled={isSubmitting}>
                        {t.selectAll}
                      </button>
                      <button type="button" onClick={() => clearPermissionGroup(availablePermissions)} disabled={isSubmitting}>
                        {t.clearAll}
                      </button>
                    </div>
                  </div>
                  <div className="permission-grid">
                    {availablePermissions.map((permission) => {
                      const isSelected = selectedPermissions.includes(permission);
                      const text = permissionText[language][permission];
                      return (
                        <button
                          className={`permission-card${isSelected ? " active" : ""}`}
                          type="button"
                          key={permission}
                          onClick={() => togglePermission(permission)}
                          aria-pressed={isSelected}
                          disabled={isSubmitting}
                        >
                          <span className="permission-check">{isSelected ? <CheckCircle2 size={16} /> : <Shield size={16} />}</span>
                          <span>
                            <strong>{text.title}</strong>
                            <small>{text.detail}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <span className="button-loader" /> : <UserPlus size={18} />}
          {isSubmitting ? t.loading : t.invite}
        </button>
      </form>
    </Modal>
  );
}

function PermissionEditModal({
  language,
  t,
  actor,
  member,
  onClose,
  onSaved
}: {
  language: Language;
  t: Record<string, string>;
  actor: UserAccount;
  member: UserAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const availablePermissionIds = useMemo(() => assignablePermissionsFor(actor, member.role), [actor, member.role]);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionId[]>(() =>
    member.permissions.filter((permission): permission is PermissionId => availablePermissionIds.includes(permission as PermissionId))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function togglePermission(permission: PermissionId) {
    setSelectedPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]
    );
  }

  function selectPermissionGroup(permissions: PermissionId[]) {
    setSelectedPermissions((current) => Array.from(new Set([...current, ...permissions])));
  }

  function clearPermissionGroup(permissions: PermissionId[]) {
    setSelectedPermissions((current) => current.filter((permission) => !permissions.includes(permission)));
  }

  async function submitPermissions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await api.updateUserPermissions(member.id, selectedPermissions);
      onSaved();
    } catch (err) {
      setError(getDisplayError(err, t.error));
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={text(t, "editPermissions", "Edit Permissions")} eyebrow={`${member.name} - ${roleLabels[language][member.role]}`} onClose={onClose}>
      <form className="form-grid" onSubmit={submitPermissions}>
        <div className="permission-hero">
          <span>
            <ShieldCheck size={19} />
          </span>
          <div>
            <strong>{t.permissions}</strong>
            <small>
              {selectedPermissions.length} {t.selected}
            </small>
          </div>
        </div>
        <div className="permission-groups">
          {permissionGroups.map((group) => {
            const availablePermissions = group.permissions.filter((permission) => availablePermissionIds.includes(permission));
            if (availablePermissions.length === 0) return null;
            const Icon = group.icon;
            return (
              <section className="permission-group" key={group.group}>
                <div className="permission-group-head">
                  <Icon size={16} />
                  <strong>{group.group}</strong>
                  <div className="permission-actions section-actions">
                    <button type="button" onClick={() => selectPermissionGroup(availablePermissions)} disabled={isSubmitting}>
                      {t.selectAll}
                    </button>
                    <button type="button" onClick={() => clearPermissionGroup(availablePermissions)} disabled={isSubmitting}>
                      {t.clearAll}
                    </button>
                  </div>
                </div>
                <div className="permission-grid">
                  {availablePermissions.map((permission) => {
                    const isSelected = selectedPermissions.includes(permission);
                    const permissionCopy = permissionText[language][permission];
                    return (
                      <button
                        className={`permission-card${isSelected ? " active" : ""}`}
                        type="button"
                        key={permission}
                        onClick={() => togglePermission(permission)}
                        aria-pressed={isSelected}
                        disabled={isSubmitting}
                      >
                        <span className="permission-check">{isSelected ? <CheckCircle2 size={16} /> : <Shield size={16} />}</span>
                        <span>
                          <strong>{permissionCopy.title}</strong>
                          <small>{permissionCopy.detail}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <span className="button-loader" /> : <Save size={18} />}
          {isSubmitting ? t.loading : t.save}
        </button>
      </form>
    </Modal>
  );
}

function PlansView({
  language,
  t,
  user,
  plans,
  loading,
  onChanged,
  onPurchase
}: {
  language: Language;
  t: Record<string, string>;
  user: UserAccount;
  plans: Plan[];
  loading: boolean;
  onChanged: () => void;
  onPurchase: (planId: string) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletePlanTarget, setDeletePlanTarget] = useState<Plan | null>(null);
  const [purchasingPlanId, setPurchasingPlanId] = useState("");
  const [deletingPlanId, setDeletingPlanId] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "mine">("all");
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const debouncedPlanSearch = useDebouncedValue(planSearchQuery, 300);
  const [selectedAudience, setSelectedAudience] = useState<Role>(inviteMatrix[user.role][0] || "user");
  const [serverPlans, setServerPlans] = useState<Plan[]>(plans);
  const [planTotal, setPlanTotal] = useState(plans.length);
  const [plansLoading, setPlansLoading] = useState(loading);
  const [plansReloadKey, setPlansReloadKey] = useState(0);
  const creatableAudiences = inviteMatrix[user.role];
  const canCreatePlan = creatableAudiences.length > 0;
  const planPagination = useServerPagination<Plan>(
    `plans:${user.id}:${planFilter}:${debouncedPlanSearch}`,
    planTotal
  );

  useEffect(() => {
    let mounted = true;
    setPlansLoading(true);
    api.plansPage({
      page: planPagination.page,
      limit: planPagination.pageSize,
      search: debouncedPlanSearch,
      filter: user.role === "super_admin" ? "all" : planFilter
    })
      .then((response) => {
        if (mounted) {
          setServerPlans(response.items);
          setPlanTotal(response.pagination.total);
        }
      })
      .catch(() => {
        if (mounted) {
          setServerPlans([]);
          setPlanTotal(0);
        }
      })
      .finally(() => {
        if (mounted) setPlansLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [debouncedPlanSearch, planFilter, planPagination.page, planPagination.pageSize, plansReloadKey, user.id, user.role]);

  async function purchase(planId: string) {
    if (purchasingPlanId) return;
    setPurchasingPlanId(planId);
    setMessage("");
    setError("");
    try {
      await onPurchase(planId);
      setMessage(t.planPurchased);
      setPlansReloadKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setPurchasingPlanId("");
    }
  }

  async function removePlan(planId: string) {
    if (deletingPlanId) return;
    setDeletingPlanId(planId);
    setMessage("");
    setError("");
    try {
      await api.deletePlan(planId);
      setMessage(t.formCreated);
      setDeletePlanTarget(null);
      setPlansReloadKey((key) => key + 1);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setDeletingPlanId("");
    }
  }

  return (
    <div className="view-stack">
      <section className="page-heading page-heading-compact">
        <div>
          <p className="eyebrow">- {t.plans}</p>
          <h1>{t.planBuilder}</h1>
        </div>
        {canCreatePlan && (
          <button className="primary-button" type="button" onClick={() => setPlanModalOpen(true)}>
            <Plus size={18} />
            {t.addNewPlan}
          </button>
        )}
      </section>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <DataPanel
        action={<ListSearch value={planSearchQuery} onChange={setPlanSearchQuery} placeholder={t.searchPlans} />}
        footer={!plansLoading ? <PaginationControls pagination={planPagination} t={t} /> : null}
      >
        {plansLoading ? (
          <CardSkeleton rows={3} grid />
        ) : (
          <div className="plan-view-stack">
            {user.role !== "super_admin" && (
              <div className="filter-tabs">
                {[
                  { id: "all", label: text(t, "allPlans", "All Plans") },
                  { id: "mine", label: text(t, "myPlans", "My Plans") }
                ].map((filter) => (
                  <button className={planFilter === filter.id ? "active" : ""} type="button" key={filter.id} onClick={() => setPlanFilter(filter.id as typeof planFilter)}>
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
            <div className="plan-grid">
              {serverPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  language={language}
                  t={t}
                  plan={plan}
                  action={
                    <div className="plan-actions">
                      {(plan.audienceRole === user.role || plan.audienceUserId === user.id) && (
                        <button className="secondary-button" type="button" onClick={() => purchase(plan.id)} disabled={Boolean(purchasingPlanId)}>
                          {purchasingPlanId === plan.id && <span className="button-loader dark" />}
                          {purchasingPlanId === plan.id ? t.loading : t.purchasePlan}
                        </button>
                      )}
                      {(plan.ownerRole === user.role || user.role === "super_admin") && (
                        <>
                          <button className="secondary-button icon-text-button" type="button" onClick={() => setEditingPlan(plan)}>
                            <Pencil size={16} />
                            {t.editPlan}
                          </button>
                          <button className="secondary-button danger-button icon-text-button" type="button" onClick={() => setDeletePlanTarget(plan)} disabled={Boolean(deletingPlanId)}>
                            {deletingPlanId === plan.id ? <span className="button-loader dark" /> : <X size={16} />}
                            {deletingPlanId === plan.id ? t.loading : t.deletePlan}
                          </button>
                        </>
                      )}
                    </div>
                  }
                />
              ))}
            </div>
            {serverPlans.length === 0 && <div className="empty-state">{debouncedPlanSearch.trim() ? t.noSearchResults : t.noData}</div>}
          </div>
        )}
      </DataPanel>
      {planModalOpen && canCreatePlan && (
        <Modal title={t.addNewPlan} eyebrow={roleLabels[language][selectedAudience]} onClose={() => setPlanModalOpen(false)}>
          {creatableAudiences.length > 1 && (
            <div className="role-picker plan-audience-picker" role="radiogroup" aria-label={t.audience}>
              {creatableAudiences.map((role) => (
                <button
                  className={`role-option${selectedAudience === role ? " active" : ""}`}
                  key={role}
                  type="button"
                  onClick={() => setSelectedAudience(role)}
                >
                  <span className="role-option-icon"><WalletCards size={17} /></span>
                  <span><strong>{roleLabels[language][role]}</strong></span>
                  {selectedAudience === role && <CheckCircle2 size={18} />}
                </button>
              ))}
            </div>
          )}
          <PlanForm
            language={language}
            t={t}
            audience={selectedAudience}
            onChanged={() => {
              setPlanModalOpen(false);
              setPlansReloadKey((key) => key + 1);
              onChanged();
            }}
          />
        </Modal>
      )}
      {editingPlan && (
        <Modal title={t.editPlan} eyebrow={roleLabels[language][editingPlan.audienceRole]} onClose={() => setEditingPlan(null)}>
          <PlanForm
            language={language}
            t={t}
            audience={editingPlan.audienceRole}
            initialPlan={editingPlan}
            onChanged={() => {
              setEditingPlan(null);
              setPlansReloadKey((key) => key + 1);
              onChanged();
            }}
          />
        </Modal>
      )}
      {deletePlanTarget && (
        <Modal title={text(t, "deletePlanTitle", "Delete Plan")} eyebrow={deletePlanTarget.name} onClose={() => setDeletePlanTarget(null)}>
          <div className="notice-card">
            <X size={22} />
            <div>
              <strong>{t.confirmDeletePlan}</strong>
              <span>{text(t, "deletePlanMessage", "This Plan will be removed from Available Plans.")}</span>
            </div>
          </div>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={() => setDeletePlanTarget(null)} disabled={Boolean(deletingPlanId)}>
              {text(t, "cancel", "Cancel")}
            </button>
            <button className="secondary-button danger-button" type="button" onClick={() => removePlan(deletePlanTarget.id)} disabled={Boolean(deletingPlanId)}>
              {deletingPlanId === deletePlanTarget.id ? <span className="button-loader dark" /> : <X size={16} />}
              {deletingPlanId === deletePlanTarget.id ? t.loading : t.deletePlan}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function WalletView({
  language,
  t,
  user,
  wallet,
  canRecharge,
  onRecharge
}: {
  language: Language;
  t: Record<string, string>;
  user: UserAccount;
  wallet: WalletSummary | null;
  canRecharge: boolean;
  onRecharge: () => void;
}) {
  const [walletSearchQuery, setWalletSearchQuery] = useState("");
  const debouncedWalletSearch = useDebouncedValue(walletSearchQuery, 300);
  const [serverWallet, setServerWallet] = useState<WalletSummary | null>(wallet);
  const [walletLoading, setWalletLoading] = useState(!wallet);
  const [editingBalanceAccount, setEditingBalanceAccount] = useState<NonNullable<WalletSummary["userBalances"]>[number] | null>(null);
  const [editingBalanceValue, setEditingBalanceValue] = useState("");
  const [editingBalanceError, setEditingBalanceError] = useState("");
  const [editingBalanceSaving, setEditingBalanceSaving] = useState(false);
  const transactionPagination = useServerPagination<WalletSummary["transactions"][number]>(
    `wallet:${user.id}:${debouncedWalletSearch}`,
    serverWallet?.transactionsPagination?.total ?? serverWallet?.transactions.length ?? 0
  );
  const transactions = serverWallet?.transactions || [];
  const userBalances = (serverWallet?.userBalances || []).filter((account) => account.role !== "super_admin");

  useEffect(() => {
    let mounted = true;
    setWalletLoading(true);
    api.wallet({
      page: transactionPagination.page,
      limit: transactionPagination.pageSize,
      search: debouncedWalletSearch
    })
      .then((nextWallet) => {
        if (mounted) setServerWallet(nextWallet);
      })
      .catch(() => {
        if (mounted) setServerWallet(null);
      })
      .finally(() => {
        if (mounted) setWalletLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [debouncedWalletSearch, transactionPagination.page, transactionPagination.pageSize, user.id]);


  const activityTitle = user.role === "super_admin" ? t.platformWalletActivity : t.recentWalletActivity;

  function openBalanceEditor(account: NonNullable<WalletSummary["userBalances"]>[number]) {
    setEditingBalanceAccount(account);
    setEditingBalanceValue(String(account.balance));
    setEditingBalanceError("");
  }

  function closeBalanceEditor() {
    if (editingBalanceSaving) return;
    setEditingBalanceAccount(null);
    setEditingBalanceValue("");
    setEditingBalanceError("");
  }

  async function saveBalanceUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingBalanceAccount) return;

    const nextBalance = Number(editingBalanceValue);
    if (!Number.isFinite(nextBalance) || nextBalance < 0) {
      setEditingBalanceError("Enter a valid non-negative wallet balance.");
      return;
    }

    setEditingBalanceSaving(true);
    setEditingBalanceError("");
    try {
      const nextWallet = await api.updateUserWalletBalance(editingBalanceAccount.id, nextBalance);
      setServerWallet(nextWallet);
      setEditingBalanceAccount(null);
      setEditingBalanceValue("");
    } catch (err) {
      setEditingBalanceError(getDisplayError(err, t.error));
    } finally {
      setEditingBalanceSaving(false);
    }
  }

  return (
    <div className="view-stack">
      <section className="page-heading page-heading-compact">
        <div>
          <p className="eyebrow">- {t.wallet}</p>
          <h1>{activityTitle}</h1>
        </div>
        <button className="primary-button" type="button" onClick={onRecharge} disabled={!canRecharge}>
          <IndianRupee size={18} />
          {t.rechargeWallet}
        </button>
      </section>

      {user.role !== "user" && userBalances.length > 0 && (
        <section className="wallet-balance-chip-strip" aria-label="User wallet balances">
          {userBalances.map((account) => (
            <article className="wallet-balance-chip" key={account.id}>
              <div className="wallet-balance-chip-top">
                <strong>{account.name}</strong>
                {user.role === "super_admin" && (
                  <button className="wallet-balance-edit" type="button" onClick={() => openBalanceEditor(account)} aria-label={`Edit ${account.name} wallet balance`}>
                    <Pencil size={14} />
                  </button>
                )}
              </div>
              <b>{formatConnects(account.balance)}</b>
            </article>
          ))}
        </section>
      )}

      <DataPanel
        action={<ListSearch value={walletSearchQuery} onChange={setWalletSearchQuery} placeholder={t.searchWalletActivity} />}
        footer={!walletLoading && serverWallet ? <PaginationControls pagination={transactionPagination} t={t} /> : null}
      >
        {walletLoading ? (
          <ListSkeleton rows={6} />
        ) : transactions.length === 0 ? (
          <div className="empty-state">{debouncedWalletSearch.trim() ? t.noSearchResults : t.noData}</div>
        ) : (
          <div className="compact-list wallet-activity-list">
            {transactions.map((transaction) => (
              <div className="compact-row wallet-activity-row" key={transaction.id}>
                <div>
                  <strong>{transaction.description}</strong>
                  {user.role !== "user" && transaction.accountName && (
                    <span>{transaction.accountName} - {transaction.accountEmail}</span>
                  )}
                  <span>{formatShortDate(transaction.createdAt, language)}</span>
                </div>
                <Badge tone={transaction.type === "credit" ? "success" : "muted"}>
                  {transaction.connectsDelta > 0 ? "+" : ""}
                  {formatConnects(transaction.connectsDelta)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DataPanel>

      {editingBalanceAccount && (
        <Modal eyebrow="Wallet" title="Edit Wallet Balance" onClose={closeBalanceEditor}>
          <form className="form-grid wallet-balance-edit-form" onSubmit={saveBalanceUpdate}>
            <label>
              Account
              <input value={`${editingBalanceAccount.name} - ${editingBalanceAccount.email}`} readOnly />
            </label>
            <label>
              Wallet Balance
              <input
                type="number"
                min="0"
                step="0.01"
                value={editingBalanceValue}
                onChange={(event) => setEditingBalanceValue(event.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </label>
            {editingBalanceError && <p className="form-error">{editingBalanceError}</p>}
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={closeBalanceEditor} disabled={editingBalanceSaving}>
                Cancel
              </button>
              <button className="primary-button" type="submit" disabled={editingBalanceSaving}>
                {editingBalanceSaving ? <span className="button-loader" /> : <Save size={18} />}
                Save Balance
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}


function BillingView({ language, t, user }: { language: Language; t: Record<string, string>; user: UserAccount }) {
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const debouncedInvoiceSearch = useDebouncedValue(invoiceSearchQuery, 300);
  const [dateFrom, setDateFrom] = useState(monthStartInputValue());
  const [dateTo, setDateTo] = useState(todayInputValue());
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceActionKey, setInvoiceActionKey] = useState("");
  const [error, setError] = useState("");
  const invoicePagination = useServerPagination<BillingInvoice>(
    `billing-invoices:${user.id}:${dateFrom}:${dateTo}:${debouncedInvoiceSearch}`,
    invoiceTotal
  );

  async function fetchInvoices(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const nextPage = event ? 1 : invoicePagination.page;
    const searchValue = event ? invoiceSearchQuery : debouncedInvoiceSearch;
    if (event) invoicePagination.setPage(1);
    setLoadingInvoices(true);
    setError("");
    try {
      const response = await api.walletInvoices({
        page: nextPage,
        limit: invoicePagination.pageSize,
        search: searchValue,
        dateFrom,
        dateTo
      });
      setInvoices(response.items);
      setInvoiceTotal(response.pagination?.total ?? response.items.length);
    } catch (err) {
      setError(getDisplayError(err, t.error));
      setInvoices([]);
      setInvoiceTotal(0);
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function handleInvoiceFile(invoice: BillingInvoice, action: "view" | "download") {
    if (!invoice.invoiceId) return;
    const actionKey = `${invoice.id}:${action}`;
    const viewerWindow = action === "view" ? window.open("", "_blank") : null;
    setInvoiceActionKey(actionKey);
    setError("");
    try {
      const blob = await api.walletInvoiceFile(invoice.invoiceId, action);
      const fileName = `wallet-recharge-invoice-${invoice.invoiceId}.pdf`;
      if (action === "view") {
        openBlobInWindow(blob, fileName, viewerWindow);
      } else {
        downloadBlob(blob, fileName);
      }
    } catch (err) {
      if (viewerWindow) viewerWindow.close();
      setError(getDisplayError(err, t.error));
    } finally {
      setInvoiceActionKey("");
    }
  }

  useEffect(() => {
    fetchInvoices();
  }, [invoicePagination.page, invoicePagination.pageSize, debouncedInvoiceSearch]);

  return (
    <div className="view-stack billing-view">
      <section className="page-heading page-heading-compact">
        <div>
          <p className="eyebrow">- Billing</p>
          <h1>Invoices</h1>
        </div>
      </section>

      <DataPanel
        action={
          <form className="report-filter-bar billing-filter-bar" onSubmit={fetchInvoices}>
            <ListSearch value={invoiceSearchQuery} onChange={setInvoiceSearchQuery} placeholder="Search invoices..." />
            <label className="modern-date-field">
              <span>From</span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="modern-date-field">
              <span>To</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <button className="primary-button" type="submit" disabled={loadingInvoices}>
              {loadingInvoices ? <span className="button-loader" /> : <Search size={18} />}
              Fetch Invoices
            </button>
          </form>
        }
        footer={!loadingInvoices ? <PaginationControls pagination={invoicePagination} t={t} /> : null}
      >
        {error && <p className="form-error">{error}</p>}
        {loadingInvoices && invoices.length === 0 ? (
          <TableSkeleton rows={6} />
        ) : invoices.length === 0 ? (
          <div className="empty-state">No invoices found</div>
        ) : (
          <div className="table-wrap billing-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {user.role === "super_admin" && <th>Client</th>}
                  <th>Recharge</th>
                  <th>GST</th>
                  <th>Wallet Credit</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td data-label="Date">
                      {formatShortDate(invoice.paidAt || invoice.createdAt, language)}
                      <small>{formatShortTime(invoice.paidAt || invoice.createdAt)}</small>
                    </td>
                    {user.role === "super_admin" && (
                      <td data-label="Client">
                        <strong>{invoice.userName || "-"}</strong>
                        <small>{invoice.userEmail || "-"}</small>
                      </td>
                    )}
                    <td data-label="Recharge">{formatCurrency(invoice.amount, language)}</td>
                    <td data-label="GST">{formatCurrency(invoice.gstAmount, language)}</td>
                    <td data-label="Wallet Credit">{formatCurrency(invoice.walletCreditAmount, language)}</td>
                    <td data-label="Action">
                      <div className="invoice-action-buttons">
                        {invoice.invoiceId && (
                          <button
                            className="primary-button compact-action"
                            type="button"
                            disabled={invoiceActionKey === `${invoice.id}:view`}
                            onClick={() => void handleInvoiceFile(invoice, "view")}
                          >
                            <Eye size={15} />
                            {invoiceActionKey === `${invoice.id}:view` ? t.loading : "View"}
                          </button>
                        )}
                        {invoice.invoiceId && (
                          <button
                            className="primary-button compact-action"
                            type="button"
                            disabled={invoiceActionKey === `${invoice.id}:download`}
                            onClick={() => void handleInvoiceFile(invoice, "download")}
                          >
                            <FileDown size={15} />
                            {invoiceActionKey === `${invoice.id}:download` ? t.loading : "Download"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>
    </div>
  );
}

function RechargeWalletModal({
  language,
  t,
  user,
  wallet,
  onChanged,
  onClose
}: {
  language: Language;
  t: Record<string, string>;
  user: UserAccount;
  wallet: WalletSummary | null;
  onChanged: () => Promise<WalletSummary>;
  onClose: () => void;
}) {
  const minimumRechargeAmount = ROLE_MINIMUM_RECHARGE[user.role] || 1;
  const quickRechargeAmounts = minimumRechargeAmount > 1
    ? [minimumRechargeAmount, minimumRechargeAmount * 2, minimumRechargeAmount * 4]
    : QUICK_RECHARGE_AMOUNTS;
  const [amount, setAmount] = useState(String(quickRechargeAmounts[0] || 500));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRecharging, setIsRecharging] = useState(false);
  const currentBalance = wallet?.balance ?? user.walletBalance ?? 0;
  const amountValue = Number(amount);
  const minimumRechargeMessage = `Minimum recharge amount is ${formatCurrency(minimumRechargeAmount, language)}.`;
  const minimumRechargeAlert =
    amount.trim() && Number.isFinite(amountValue) && amountValue > 0 && amountValue < minimumRechargeAmount
      ? minimumRechargeMessage
      : "";

  async function recharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const rechargeAmount = Number(amount);
      if (!Number.isFinite(rechargeAmount) || rechargeAmount <= 0) {
        throw new Error(t.rechargeAmount);
      }
      if (rechargeAmount < minimumRechargeAmount) {
        throw new Error(minimumRechargeMessage);
      }

      setIsRecharging(true);
      const order = await api.createWalletRechargeOrder(rechargeAmount);
      const loaded = await loadCashfreeCheckout();
      if (!loaded || !window.Cashfree) {
        throw new Error(text(t, "cashfreeUnavailable", "Cashfree checkout could not be loaded."));
      }

      const cashfree = window.Cashfree({ mode: order.mode });
      const result = await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_modal"
      });

      if (result?.error) {
        throw new Error(result.error.message || "Payment was not completed");
      }

      await api.verifyWalletRecharge({ orderId: order.orderId });
      await onChanged();
      setMessage(t.formCreated);
      setIsRecharging(false);
      onClose();
    } catch (err) {
      await onChanged().catch(() => undefined);
      setError(err instanceof Error ? err.message : t.error);
      setIsRecharging(false);
    }
  }

  return (
    <Modal title={t.rechargeWallet} eyebrow={t.wallet} onClose={isRecharging ? () => undefined : onClose}>
      <div className="wallet-modal-balance">
        <span>{t.currentBalance}</span>
        <strong>{formatConnects(currentBalance)}</strong>
      </div>
      <form className="form-grid" onSubmit={recharge}>
        <div className="amount-options" aria-label={t.quickAmount}>
          {quickRechargeAmounts.map((quickAmount) => (
            <button
              className={amount === String(quickAmount) ? "toggle-chip active" : "toggle-chip"}
              key={quickAmount}
              type="button"
              onClick={() => setAmount(String(quickAmount))}
              disabled={isRecharging}
            >
              {formatCurrency(quickAmount, language)}
            </button>
          ))}
        </div>
        <label>
          <span>{t.rechargeAmount}</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={blockInvalidNumberKeys}
            type="number"
            min={minimumRechargeAmount}
            step="1"
            disabled={isRecharging}
          />
        </label>
        {message && <p className="form-success">{message}</p>}
        {(error || minimumRechargeAlert) && <p className="form-error">{error || minimumRechargeAlert}</p>}
        <button className="primary-button" type="submit" disabled={isRecharging || Boolean(minimumRechargeAlert)}>
          {isRecharging ? <span className="button-loader" /> : <IndianRupee size={18} />}
          {isRecharging ? t.loading : t.rechargeWallet}
        </button>
      </form>
    </Modal>
  );
}

function ToolsView({
  t,
  wallet,
  onChanged
}: {
  t: Record<string, string>;
  wallet: WalletSummary | null;
  onChanged: () => Promise<WalletSummary>;
}) {
  const [rupeesPerConnect, setRupeesPerConnect] = useState(String(wallet?.rate.rupeesPerConnect || 1));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (wallet?.rate.rupeesPerConnect) {
      setRupeesPerConnect(String(wallet.rate.rupeesPerConnect));
    }
  }, [wallet?.rate.rupeesPerConnect]);

  async function submitRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api.updateWalletRate(Number(rupeesPerConnect));
      await onChanged();
      setMessage(t.walletRateSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">- {t.tools}</p>
          <h1>{t.connectValue}</h1>
        </div>
      </section>

      <article className="panel profile-page-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">- {t.wallet}</p>
            <h2>{t.rupeesPerConnect}</h2>
          </div>
          <ShieldCheck size={25} />
        </div>
        <form className="form-grid" onSubmit={submitRate}>
          <label>
            <span>{t.rupeesPerConnect}</span>
            <input
              value={rupeesPerConnect}
              onChange={(event) => setRupeesPerConnect(event.target.value)}
              onKeyDown={blockInvalidNumberKeys}
              type="number"
              min="0.01"
              step="0.01"
              disabled={saving}
            />
          </label>
          {message && <p className="form-success">{message}</p>}
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? <span className="button-loader" /> : <Save size={18} />}
            {saving ? t.loading : t.saveConnectValue}
          </button>
        </form>
      </article>
    </div>
  );
}

function ApiPricingView({
  t,
  user,
  users,
  pricingPayload,
  onChanged
}: {
  t: Record<string, string>;
  user: UserAccount;
  users: UserAccount[];
  pricingPayload: ApiPricingPayload | null;
  onChanged: (pricing: ApiPricingPayload) => void;
}) {
  const activeUsers = useMemo(
    () => users.filter((account) => account.status !== "suspended" && userHasAnyPricingPermission(account)),
    [users]
  );
  const canAssignPricing = user.role !== "user";
  const isSuperAdminPricing = user.role === "super_admin";
  const initialSelectedUserId = isSuperAdminPricing ? activeUsers[0]?.id || "" : user.id;
  const [selectedUserId, setSelectedUserId] = useState(initialSelectedUserId);
  const [pricingTab, setPricingTab] = useState<"mine" | "users">("mine");
  const [selectedPayload, setSelectedPayload] = useState<ApiPricingPayload | null>(pricingPayload);
  const [values, setValues] = useState<ApiPricingFormValues>(() => apiPricingToFormValues(pricingPayload?.pricing));
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [confirmPricingChange, setConfirmPricingChange] = useState(false);

  useEffect(() => {
    if (isSuperAdminPricing) {
      if (!selectedUserId && activeUsers[0]?.id) {
        setSelectedUserId(activeUsers[0].id);
      }
      return;
    }
    if (!canAssignPricing || pricingTab === "mine") {
      setSelectedUserId(user.id);
    } else if ((!selectedUserId || selectedUserId === user.id) && activeUsers[0]?.id) {
      setSelectedUserId(activeUsers[0].id);
    }
  }, [activeUsers, canAssignPricing, isSuperAdminPricing, pricingTab, selectedUserId, user.id]);

  useEffect(() => {
    if (!selectedUserId) return;
    let mounted = true;
    setLoadingPricing(true);
    setError("");
    api.apiPricing((isSuperAdminPricing || (canAssignPricing && selectedUserId !== user.id)) ? selectedUserId : undefined)
      .then((payload) => {
        if (!mounted) return;
        setSelectedPayload(payload);
        setValues(apiPricingToFormValues(payload.pricing));
        setConfirmPricingChange(false);
        onChanged(payload);
      })
      .catch((err) => {
        if (mounted) setError(getDisplayError(err, t.error));
      })
      .finally(() => {
        if (mounted) setLoadingPricing(false);
      });
    return () => {
      mounted = false;
    };
  }, [canAssignPricing, isSuperAdminPricing, selectedUserId, t.error, user.id]);

  const targetUser = selectedPayload?.user || (canAssignPricing ? activeUsers.find((account) => account.id === selectedUserId) || user : user);
  const selectedUser = activeUsers.find((account) => account.id === selectedUserId) || null;
  const canEditSelectedPricing = Boolean(canAssignPricing && targetUser && targetUser.id !== user.id && activeUsers.some((account) => account.id === targetUser.id));
  const targetPermissions = Array.from(new Set([
    ...(selectedPayload?.permissions || []),
    ...(targetUser?.permissions || []),
    ...(selectedUser?.permissions || [])
  ]));
  const assignedApiDocs = uniqueApiPricingDocs(publicApiDocs.filter((apiDoc) => permissionsIncludePricingAccess(targetPermissions, apiDoc.id)));

  async function submitPricing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEditSelectedPricing || !targetUser) return;
    if (!confirmPricingChange) {
      setError(text(t, "confirmPricingRequired", "Confirm the pricing change before saving."));
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const nextPricing = await api.updateApiPricing({ userId: targetUser.id, pricing: apiPricingFromFormValues(values) });
      setSelectedPayload(nextPricing);
      setValues(apiPricingToFormValues(nextPricing.pricing));
      setConfirmPricingChange(false);
      onChanged(nextPricing);
      setMessage(text(t, "apiPricingSaved", "API Pricing Updated"));
    } catch (err) {
      setError(getDisplayError(err, t.error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">- {t.tools}</p>
          <h1>{text(t, "apiPricing", "API Pricing")}</h1>
        </div>
      </section>
      <article className="panel profile-page-panel api-pricing-panel">
        {!isSuperAdminPricing && (
          <>
            <div className="api-pricing-tabs" role="tablist" aria-label="API pricing mode">
              <button
                className={pricingTab === "mine" ? "active" : ""}
                type="button"
                onClick={() => setPricingTab("mine")}
              >
                Your Pricing
              </button>
              {canAssignPricing && (
                <button
                  className={pricingTab === "users" ? "active" : ""}
                  type="button"
                  onClick={() => setPricingTab("users")}
                  disabled={activeUsers.length === 0}
                >
                  User Pricing
                </button>
              )}
            </div>

            <div className="api-pricing-context">
              <strong>{pricingTab === "mine" ? "Your API Pricing" : "Set User API Pricing"}</strong>
              <span>
                {pricingTab === "mine"
                  ? "These are the prices currently assigned to your account."
                  : "Select a downstream user and define the prices that will apply to their API usage."}
              </span>
            </div>
          </>
        )}

        {(isSuperAdminPricing || (pricingTab === "users" && canAssignPricing && activeUsers.length > 0)) && (
          <div className="api-pricing-user-select" onBlur={() => window.setTimeout(() => setUserPickerOpen(false), 120)}>
            <span>{text(t, "selectUser", "Select User")}</span>
            <button
              className="modern-select-button"
              type="button"
              onClick={() => setUserPickerOpen((open) => !open)}
              disabled={loadingPricing || saving}
            >
              <span>
                <strong>{selectedUser ? selectedUser.name : text(t, "selectUser", "Select User")}</strong>
                {selectedUser && <small>{selectedUser.email}</small>}
              </span>
              <ChevronDown className={userPickerOpen ? "open" : ""} size={18} />
            </button>
            {userPickerOpen && (
              <div className="modern-select-menu">
                {activeUsers.map((account) => (
                  <button
                    className={account.id === selectedUserId ? "active" : ""}
                    type="button"
                    key={account.id}
                    onMouseDown={() => {
                      setSelectedUserId(account.id);
                      setUserPickerOpen(false);
                    }}
                  >
                    <strong>{account.name}</strong>
                    <small>{account.email}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {pricingTab === "users" && canAssignPricing && activeUsers.length === 0 ? (
          <div className="empty-state">{text(t, "noApiPermission", "No downstream user with API permission is available.")}</div>
        ) : loadingPricing ? (
          <CardSkeleton rows={2} grid />
        ) : assignedApiDocs.length === 0 ? (
          <div className="empty-state">{text(t, "noApiPermission", "No API permission is assigned to this account.")}</div>
        ) : (
          <form className="form-grid" onSubmit={submitPricing}>
            <div className="api-pricing-grid">
              {assignedApiDocs.map((apiDoc) => {
                const priceKey = apiPriceKeyByPublicApiId[apiDoc.id];
                return (
                  <label className="api-pricing-card" key={apiDoc.id}>
                    <span>{apiDoc.name}</span>
                    <input
                      value={values[priceKey] ?? ""}
                      onChange={(event) => {
                        setValues((current) => ({ ...current, [priceKey]: event.target.value }));
                        setConfirmPricingChange(false);
                      }}
                      onKeyDown={blockInvalidNumberKeys}
                      type="number"
                      min="0.01"
                      step="0.01"
                      disabled={saving || !canEditSelectedPricing}
                    />
                  </label>
                );
              })}
            </div>
            {message && <p className="form-success">{message}</p>}
            {error && <p className="form-error">{error}</p>}
            {canEditSelectedPricing && (
              <>
                <label className="terms-check confirm-pricing-check">
                  <input
                    type="checkbox"
                    checked={confirmPricingChange}
                    onChange={(event) => setConfirmPricingChange(event.target.checked)}
                    disabled={saving}
                  />
                  <span>{text(t, "confirmPricingChange", "I confirm these API prices should be updated for the selected user.")}</span>
                </label>
                <button className="primary-button" type="submit" disabled={saving || !targetUser || !confirmPricingChange}>
                  {saving ? <span className="button-loader" /> : <Save size={18} />}
                  {saving ? t.loading : t.save}
                </button>
              </>
            )}
          </form>
        )}
        {error && assignedApiDocs.length === 0 && <p className="form-error">{error}</p>}
      </article>
    </div>
  );
}
function PlanForm({
  language,
  t,
  audience,
  audienceUser,
  initialPlan,
  onChanged
}: {
  language: Language;
  t: Record<string, string>;
  audience: Role;
  audienceUser?: UserAccount;
  initialPlan?: Plan;
  onChanged: () => void;
}) {
  const services = ["CIBIL"];
  const initialCibilRate = initialPlan?.serviceRates?.find((rate) => rate.service === "CIBIL")?.cost ?? 1;
  const [cibilCost, setCibilCost] = useState(String(initialCibilRate));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        name: initialPlan?.name || `CIBIL Plan - ${audienceUser?.name || roleLabels[language][audience]}`,
        services,
        serviceRates: [{ service: "CIBIL", cost: Number(cibilCost || 0) }]
      };

      const audienceRole = audienceUser?.role || audience;

      if (initialPlan) {
        await api.updatePlan(initialPlan.id, payload);
      } else {
        await api.createPlan({
          audienceRole,
          audienceUser: audienceUser?.id,
          ...payload
        });
      }

      setMessage(t.formCreated);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={submitPlan}>
      <label>
        <span>{t.audience}</span>
        <input value={audienceUser ? `${audienceUser.name} - ${roleLabels[language][audienceUser.role]}` : roleLabels[language][audience]} readOnly />
      </label>
      <div className="service-pricing-head">
        <div>
          <p className="eyebrow">- {t.services}</p>
          <h3>{t.servicePricing}</h3>
        </div>
      </div>
      <div className="service-cost-grid">
        <label>
          <span>{t.perSuccessCost}</span>
          <input
            value={cibilCost}
            onChange={(event) => setCibilCost(event.target.value)}
            onKeyDown={blockInvalidNumberKeys}
            type="number"
            min="0.01"
            step="0.01"
            disabled={isSubmitting}
          />
        </label>
      </div>
      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? <span className="button-loader" /> : <Save size={19} />}
        {isSubmitting ? t.loading : initialPlan ? t.editPlan : t.createPlan}
      </button>
    </form>
  );
}

function VerificationView({
  service,
  language,
  t,
  user,
  canRunVerification,
  onChanged
}: {
  service: ServiceKind;
  language: Language;
  t: Record<string, string>;
  user: UserAccount;
  canRunVerification: boolean;
  onChanged: () => void;
}) {
  const config = serviceConfig[service];
  const [customerName, setCustomerName] = useState("");
  const [experianFirstName, setExperianFirstName] = useState("");
  const [experianLastName, setExperianLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [remark, setRemark] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [mobile, setMobile] = useState("");
  const [gender, setGender] = useState("male");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [pincode, setPincode] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [cardImageFile, setCardImageFile] = useState<File | null>(null);
  const [esignDocumentTitle, setEsignDocumentTitle] = useState("");
  const [esignDocumentFile, setEsignDocumentFile] = useState<File | null>(null);
  const [aadhaarOtpRequestId, setAadhaarOtpRequestId] = useState("");
  const [aadhaarOtpValue, setAadhaarOtpValue] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [verifications, setVerifications] = useState<VerificationResult[]>([]);
  const [verificationTotal, setVerificationTotal] = useState(0);
  const [loadedVerificationService, setLoadedVerificationService] = useState<ServiceKind | null>(null);
  const [verificationListLoading, setVerificationListLoading] = useState(true);
  const [verificationReloadKey, setVerificationReloadKey] = useState(0);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<VerificationResult | null>(null);
  const [selectedVerificationLoading, setSelectedVerificationLoading] = useState(false);
  const [verificationSearchQuery, setVerificationSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resultBlockRef = useRef<HTMLDivElement | null>(null);
  const isCibilService = isCreditReportService(service);
  const isJsonReport = isJsonReportService(service);
  const isEquifaxService = service === "equifax-cibil" || service === "equifax-cibil-json";
  const isCrifService = service === "crif" || service === "crif-json";
  const isCrifJsonService = service === "crif-json";
  const isUanNumberService = service === "uan-profile-details" || service === "employment-history";
  const isEpfoPassbookService = service === "epfo-passbook";
  const isGstinService = service === "gstin-verification";
  const isBankVerificationService = service === "bank-verification";
  const isDrivingLicenseService = service === "driving-license";
  const isRcBasicService = service === "rc-basic";
  const isExperianService = service === "experian-json" || service === "experian-pdf";
  const isFaceMatchService = service === "face-match";
  const isMcaCompanyService = service === "mca-company";
  const isPrefillService = service === "prefill";
  const isAadhaarOtpService = service === "aadhaar-otp";
  const isAadhaarNumberService = service === "aadhaar" || service === "aadhaar-validation" || isAadhaarOtpService;
  const isEsignWorkflowService = service === "esign" || service === "econsent";
  const requiresPan = isCibilService && (!isCrifService || isCrifJsonService) && !isPrefillService;
  const debouncedVerificationSearch = useDebouncedValue(verificationSearchQuery, 300);
  const listPending = verificationListLoading || loadedVerificationService !== service;
  const displayedVerifications = listPending ? [] : verifications;
  const verificationPagination = useServerPagination<VerificationResult>(
    `${service}-verifications:${user.id}:${debouncedVerificationSearch}`,
    verificationTotal
  );
  const verificationSearchPlaceholder = isCibilService
    ? t.searchCibilReports
    : service === "pan"
      ? t.searchPanRecords
      : isEsignWorkflowService
        ? text(t, "searchEsignRecords", "Search eSign Records by Name, Email, Phone, Status...")
        : isGstinService
          ? "Search GSTIN Records by GSTIN, Name, Status..."
          : isBankVerificationService
            ? "Search Bank Records by Account, IFSC, Name, Status..."
            : isDrivingLicenseService
              ? "Search Driving License Records by Number, Name, Status..."
            : isRcBasicService
              ? "Search RC Records by Registration Number, Owner, Status..."
            : isFaceMatchService
              ? "Search Face Match Records by Name, Reference, Result..."
            : isMcaCompanyService
              ? "Search MCA Records by CIN, Company, Status..."
            : isPrefillService
              ? "Search Prefill Records by Name, Mobile, Status..."
        : t.searchAadhaarRecords;
  const verificationEmptyText = debouncedVerificationSearch.trim() ? t.noSearchResults : t.noData;
  const directServiceActionLabel =
    service === "aadhaar"
      ? t.runAadhaar
      : isEsignWorkflowService
        ? service === "econsent"
          ? text(t, "runEConsent", "Create e-Consent")
          : text(t, "createAadhaarEsign", "Create Aadhaar eSign")
        : isCibilService || isApiVerificationService(service)
          ? text(t, reportActionKeyByService[service] || config.key, text(t, config.key, config.key))
          : t.runPan;
  const directIdentifierLabel =
    isAadhaarNumberService
      ? t.aadhaarNumber
      : isEsignWorkflowService || isCrifService
        ? t.mobileNumber
        : isGstinService
          ? "GSTIN"
          : isBankVerificationService
            ? "Bank Account Number"
            : isDrivingLicenseService
              ? "Driving License Number"
            : isRcBasicService
              ? "Vehicle Registration Number"
            : isFaceMatchService
              ? "Reference"
            : isMcaCompanyService
              ? "Corporate Identity Number (CIN)"
            : isPrefillService
              ? "Mobile Number"
        : isUanNumberService
          ? "UAN Number"
          : t.panNumber;
  const directDetailLabel =
    service === "pan" ? text(t, "fullName", "Full Name") : isEsignWorkflowService ? t.email : isFaceMatchService ? "Match Result" : isCibilService ? t.status : t.status;
  const showFetchedByColumn = user.role === "super_admin" || user.role === "agent" || user.role === "sub_agent";
  const fetchedByLabel = text(t, "fetchedBy", "Fetched By");

  useEffect(() => {
    setCustomerName("");
    setExperianFirstName("");
    setExperianLastName("");
    setMiddleName("");
    setRemark("");
    setEmail("");
    setIdentifier("");
    setMobile("");
    setGender("male");
    setDob("");
    setAddress("");
    setStateCode("");
    setPincode("");
    setIfsc("");
    setEsignDocumentTitle("");
    setEsignDocumentFile(null);
    setAadhaarOtpRequestId("");
    setAadhaarOtpValue("");
    setResult(null);
    setError("");
    setVerificationSearchQuery("");
    setSelectedVerification(null);
    setSelectedVerificationLoading(false);
    setVerificationTotal(0);
    setVerifications([]);
  }, [service]);

  useEffect(() => {
    if (result && verificationModalOpen && resultBlockRef.current) {
      const scrollToResult = () => {
        const resultNode = resultBlockRef.current;
        const modalPanel = resultNode?.closest(".modal-panel");
        if (modalPanel instanceof HTMLElement) {
          modalPanel.scrollTo({ top: modalPanel.scrollHeight, behavior: "smooth" });
          return;
        }
        resultNode?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      };
      requestAnimationFrame(() => requestAnimationFrame(scrollToResult));
      const timeoutId = window.setTimeout(scrollToResult, 180);
      return () => window.clearTimeout(timeoutId);
    }
  }, [result, verificationModalOpen]);

  useEffect(() => {
    if (service !== "experian-pdf" || result?.status !== "pending" || !result.id) return;

    let polling = false;
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const updated = await api.verificationDetail("experian-pdf", result.id);
        setResult(updated);
        setVerifications((current) => [updated, ...current.filter((item) => item.id !== updated.id)]);
        if (updated.status !== "pending") {
          setVerificationReloadKey((key) => key + 1);
          onChanged();
        }
      } catch {
        // A transient polling failure should not replace the processing state.
      } finally {
        polling = false;
      }
    };

    const timer = window.setInterval(() => void poll(), 2500);
    void poll();
    return () => window.clearInterval(timer);
  }, [service, result?.id, result?.status]);

  useEffect(() => {
    setVerificationListLoading(true);
    setLoadedVerificationService(null);
    setVerifications([]);
    let mounted = true;
    api.verifications(service, {
      page: verificationPagination.page,
      limit: verificationPagination.pageSize,
      search: debouncedVerificationSearch
    })
      .then((response) => {
        if (mounted) {
          setVerifications(response.items);
          setVerificationTotal(response.pagination.total);
          setLoadedVerificationService(service);
        }
      })
      .catch(() => {
        if (mounted) {
          setVerifications([]);
          setVerificationTotal(0);
          setLoadedVerificationService(service);
        }
      })
      .finally(() => {
        if (mounted) {
          setVerificationListLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [debouncedVerificationSearch, service, verificationPagination.page, verificationPagination.pageSize, verificationReloadKey]);

  async function submitVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRunVerification || isSubmitting) return;

    setIsSubmitting(true);
    setResult(null);
    setError("");
    if ((service === "pan" || service === "uan-fetch-by-pan" || service === "epfo-passbook") && !isValidPanValue(identifier)) {
      setError(t.invalidPan);
      setIsSubmitting(false);
      return;
    }
    if (isUanNumberService && !/^\d{12}$/.test(identifier.replace(/\D/g, ""))) {
      setError("Enter a valid 12 digit UAN number");
      setIsSubmitting(false);
      return;
    }
    if (isEpfoPassbookService && !isValidMobileValue(mobile)) {
      setError(text(t, "invalidMobile", "Enter a valid 10 digit mobile number."));
      setIsSubmitting(false);
      return;
    }
    if (isAadhaarNumberService && !isValidAadhaarValue(identifier)) {
      setError(t.invalidAadhaar);
      setIsSubmitting(false);
      return;
    }
    if (isGstinService && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(identifier.trim().toUpperCase())) {
      setError("Enter a valid GSTIN.");
      setIsSubmitting(false);
      return;
    }
    if (isBankVerificationService && !/^\d{6,18}$/.test(identifier.replace(/\D/g, ""))) {
      setError("Enter a valid bank account number.");
      setIsSubmitting(false);
      return;
    }
    if (isDrivingLicenseService && identifier.trim().length < 6) {
      setError("Enter a valid driving license number.");
      setIsSubmitting(false);
      return;
    }
    if (isDrivingLicenseService && !dobInputToApi(dob)) {
      setError("Enter date of birth in YYYY-MM-DD format.");
      setIsSubmitting(false);
      return;
    }
    const cleanIfsc = isBankVerificationService
      ? normalizeIfscCode(((event.currentTarget.elements.namedItem("ifsc") as HTMLInputElement | null)?.value || ifsc))
      : "";
    const cleanDrivingLicenseDob = isDrivingLicenseService ? dobInputToApi(dob) : "";
    if (isAadhaarOtpService && aadhaarOtpRequestId.trim() && !aadhaarOtpValue.trim()) {
      setError("Enter the OTP received on the linked mobile number.");
      setIsSubmitting(false);
      return;
    }
    if (isAadhaarOtpService && !aadhaarOtpRequestId.trim() && aadhaarOtpValue.trim()) {
      setError("Generate OTP first, then enter the OTP.");
      setIsSubmitting(false);
      return;
    }
    if (isEsignWorkflowService && !isValidMobileValue(identifier)) {
      setError(text(t, "invalidMobile", "Enter a valid 10 digit mobile number."));
      setIsSubmitting(false);
      return;
    }
    if (isEsignWorkflowService && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(text(t, "emailRequiredForReset", "Enter your email address first."));
      setIsSubmitting(false);
      return;
    }
    let esignDocumentFileDataUrl = "";
    let selfieFileDataUrl = "";
    let cardImageFileDataUrl = "";
    if (isEsignWorkflowService) {
      if (!esignDocumentTitle.trim()) {
        setError("Document title is required");
        setIsSubmitting(false);
        return;
      }
      if (!esignDocumentFile) {
        setError("Upload a PDF document");
        setIsSubmitting(false);
        return;
      }
      if (!/\.pdf$/i.test(esignDocumentFile.name) && esignDocumentFile.type !== "application/pdf") {
        setError("Only PDF documents are allowed");
        setIsSubmitting(false);
        return;
      }
      if (esignDocumentFile.size > 50 * 1024 * 1024) {
        setError("PDF document must be 50MB or smaller");
        setIsSubmitting(false);
        return;
      }
      try {
        esignDocumentFileDataUrl = await fileToDataUrl(esignDocumentFile);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.error);
        setIsSubmitting(false);
        return;
      }
    }
    if (isFaceMatchService) {
      if (!selfieFile || !cardImageFile) {
        setError("Upload both the selfie and identity-card images.");
        setIsSubmitting(false);
        return;
      }
      if (!selfieFile.type.startsWith("image/") || !cardImageFile.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        setIsSubmitting(false);
        return;
      }
      try {
        selfieFileDataUrl = await fileToDataUrl(selfieFile);
        cardImageFileDataUrl = await fileToDataUrl(cardImageFile);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.error);
        setIsSubmitting(false);
        return;
      }
    }
    if (requiresPan && !isValidPanValue(identifier)) {
      setError(t.invalidPan);
      setIsSubmitting(false);
      return;
    }
    if (isCibilService && !isPrefillService && !isValidMobileValue(mobile)) {
      setError(text(t, "invalidMobile", "Enter a valid 10 digit mobile number."));
      setIsSubmitting(false);
      return;
    }
    if ((isEquifaxService || isCrifJsonService) && !dobInputToApi(dob)) {
      setError(text(t, "dateOfBirth", "Date of Birth"));
      setIsSubmitting(false);
      return;
    }
    if (isEquifaxService && !address.trim()) {
      setError(text(t, "address", "Address"));
      setIsSubmitting(false);
      return;
    }
    if (isEquifaxService && !/^[A-Za-z]{2}$/.test(stateCode.trim())) {
      setError(text(t, "state", "State"));
      setIsSubmitting(false);
      return;
    }
    if (isEquifaxService && !/^\d{6}$/.test(pincode.trim())) {
      setError(text(t, "pincode", "Pincode"));
      setIsSubmitting(false);
      return;
    }
    if (isExperianService && (!experianFirstName.trim() || !experianLastName.trim())) {
      setError("First name and last name are required.");
      setIsSubmitting(false);
      return;
    }
    if (isRcBasicService && !/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/.test(identifier.trim().toUpperCase().replace(/\s+/g, ""))) {
      setError("Enter a valid vehicle registration number.");
      setIsSubmitting(false);
      return;
    }
    if (isExperianService && !isValidDdMmYyyy(dob)) {
      setError("Enter date of birth in DD/MM/YYYY format.");
      setIsSubmitting(false);
      return;
    }
    if (isExperianService && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      setIsSubmitting(false);
      return;
    }
    if (isExperianService && (!address.trim() || !/^\d{6}$/.test(pincode.trim()))) {
      setError("Address and a valid pincode are required.");
      setIsSubmitting(false);
      return;
    }
    if (isMcaCompanyService && !/^[A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(identifier.trim().toUpperCase())) {
      setError("Enter a valid 21 character CIN.");
      setIsSubmitting(false);
      return;
    }
    if (isPrefillService && (!experianFirstName.trim() || !experianLastName.trim() || !isValidMobileValue(identifier))) {
      setError("First name, last name and a valid 10 digit mobile number are required.");
      setIsSubmitting(false);
      return;
    }
    try {
      const response = await api.verify(service, {
        customerName:
          service === "aadhaar"
            ? "Aadhaar verification"
            : service === "aadhaar-validation"
              ? "Aadhaar Validation"
              : service === "aadhaar-otp"
                ? "Aadhaar OTP"
                : service === "pan"
                  ? "PAN verification"
                  : service === "uan-fetch-by-pan"
                    ? "Fetch UAN by PAN"
                    : service === "uan-profile-details"
                      ? "UAN Profile Details"
                      : service === "employment-history"
                        ? "Employment History"
                        : service === "epfo-passbook"
                          ? "EPFO Passbook"
                          : service === "gstin-verification"
                            ? "GSTIN Verification"
                            : service === "bank-verification"
                              ? "Bank Verification"
                              : service === "driving-license"
                                ? "Driving License Verification"
                              : service === "rc-basic"
                                ? "Basic RC Verification"
                              : service === "face-match"
                                ? customerName || "Face Match"
                              : service === "mca-company"
                                ? "MCA Company Details"
                              : service === "prefill"
                                ? [experianFirstName, middleName, experianLastName].filter(Boolean).join(" ")
                          : isExperianService
                            ? `${experianFirstName.trim()} ${experianLastName.trim()}`
                            : customerName,
        identifier: isEsignWorkflowService ? identifier.replace(/\D/g, "") : identifier,
        ...(isAadhaarOtpService ? { requestId: aadhaarOtpRequestId.trim(), otp: aadhaarOtpValue.trim() } : {}),
        ...(isEsignWorkflowService ? {
          email,
          mobile: identifier.replace(/\D/g, ""),
          documentTitle: esignDocumentTitle.trim(),
          documentFileName: esignDocumentFile?.name || "",
          documentFileDataUrl: esignDocumentFileDataUrl,
          location: "India",
          date: new Date().toISOString()
        } : {}),
        ...(isEpfoPassbookService ? { mobile } : {}),
        ...(isBankVerificationService ? { ifsc: cleanIfsc } : {}),
        ...(isDrivingLicenseService ? { dob: cleanDrivingLicenseDob } : {}),
        ...(isFaceMatchService ? {
          selfieFileName: selfieFile?.name || "selfie.jpg",
          selfieFileDataUrl,
          cardImageFileName: cardImageFile?.name || "card-image.jpg",
          cardImageFileDataUrl
        } : {}),
        ...(isMcaCompanyService ? { remark: remark.trim() } : {}),
        ...(isPrefillService ? {
          firstName: experianFirstName.trim(),
          middleName: middleName.trim(),
          lastName: experianLastName.trim(),
          remark: remark.trim()
        } : {}),
        ...(isCibilService && !isPrefillService ? { mobile, gender } : {}),
        ...(isEquifaxService ? { dob: dobInputToApi(dob), address, state: stateCode, pincode } : {}),
        ...(isCrifJsonService ? { dob: dobInputToApi(dob) } : {}),
        ...(isExperianService
          ? {
              firstName: experianFirstName.trim(),
              lastName: experianLastName.trim(),
              email,
              dob,
              address,
              pincode
            }
          : {}),
        actorName: user.name,
        actorRole: user.role
      });
      applyVerificationResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyVerificationResponse(response: VerificationResult) {
    if (isAadhaarOtpService) {
      const nextRequestId = String(response.details?.requestId || response.providerReference || "").trim();
      if (nextRequestId) setAadhaarOtpRequestId(nextRequestId);
      if (response.status === "pending") setAadhaarOtpValue("");
    }
    setResult(response);
    setVerifications((current) => [response, ...current.filter((item) => item.id !== response.id)]);
    setVerificationTotal((total) => total + (verifications.some((item) => item.id === response.id) ? 0 : 1));
    setLoadedVerificationService(service);
    setVerificationListLoading(false);
    verificationPagination.setPage(1);
    setVerificationReloadKey((key) => key + 1);
    onChanged();
  }

  async function refreshVerificationStatus(targetId?: string) {
    if (isEsignWorkflowService && targetId) {
      const refreshed = await api.fetchEsignStatus(targetId, service as "esign" | "econsent");
      setVerifications((current) => [refreshed, ...current.filter((item) => item.id !== refreshed.id)]);
      setResult((current) => current && current.id === refreshed.id ? refreshed : current);
      setSelectedVerification((current) => current && current.id === refreshed.id ? refreshed : current);
      return;
    }

    const response = await api.verifications(service, {
      page: verificationPagination.page,
      limit: verificationPagination.pageSize,
      search: debouncedVerificationSearch
    });
    setVerifications(response.items);
    setVerificationTotal(response.pagination.total);
    const refreshed = targetId ? response.items.find((item) => item.id === targetId) : response.items[0];
    if (refreshed) {
      setResult((current) => current && current.id === refreshed.id ? refreshed : current);
      setSelectedVerification((current) => current && current.id === refreshed.id ? refreshed : current);
    }
  }

  async function openVerificationDetail(item: VerificationResult) {
    setError("");
    setSelectedVerification(item);

    if (!isEsignWorkflowService && !isJsonReport && !isApiVerificationService(service)) return;

    setSelectedVerificationLoading(true);
    try {
      const detail = service === "econsent"
        ? await api.fetchEsignStatus(item.id, "econsent")
        : await api.verificationDetail(service, item.id);
      setSelectedVerification(detail);
      setVerifications((current) => current.map((record) => record.id === detail.id ? detail : record));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setSelectedVerificationLoading(false);
    }
  }

  const lockEsignResultForm = isEsignWorkflowService && Boolean(result);

  if (service === "aadhaar" || isEsignWorkflowService || isApiVerificationService(service) || isPrefillService) {
    return (
      <div className="view-stack">
        <section className="page-heading page-heading-compact">
          <div>
            <p className="eyebrow">- {t.service}</p>
            <h1>{text(t, config.key, config.key)}</h1>
          </div>
          <button className="primary-button" type="button" onClick={() => {
            setResult(null);
            setError("");
            if (isEsignWorkflowService) {
              setEsignDocumentFile(null);
            }
            if (isFaceMatchService) {
              setSelfieFile(null);
              setCardImageFile(null);
            }
            setVerificationModalOpen(true);
          }}>
            <Plus size={18} />
            {directServiceActionLabel}
          </button>
        </section>

        <DataPanel
          action={<ListSearch value={verificationSearchQuery} onChange={setVerificationSearchQuery} placeholder={verificationSearchPlaceholder} />}
          footer={!listPending ? <PaginationControls pagination={verificationPagination} t={t} /> : null}
        >
          {listPending ? (
            <TableSkeleton rows={6} />
          ) : displayedVerifications.length === 0 ? (
            <div className="empty-state">{verificationEmptyText}</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.status}</th>
                    <th>{directIdentifierLabel}</th>
                    <th>{directDetailLabel}</th>
                    {showFetchedByColumn && <th>{fetchedByLabel}</th>}
                    <th>{t.createdAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedVerifications.map((item) => (
                    <tr className="clickable-row" key={item.id} onClick={() => void openVerificationDetail(item)}>
                      <td data-label={t.status}>
                        {isEsignWorkflowService ? esignStatusLabel(item, t) : verificationStatusLabel(item.status, t)}
                      </td>
                      <td data-label={directIdentifierLabel}>{item.identifierMasked}</td>
                      <td data-label={directDetailLabel}>
                        {String(
                          service === "pan"
                            ? item.details?.fullName || item.customerName
                            : isEsignWorkflowService
                              ? esignSourceValue(item, ["recipientEmail", "email"]) || "-"
                          : item.details?.statusDetail || item.details?.status || item.riskBand || "-"
                        )}
                      </td>
                      {showFetchedByColumn && (
                        <td data-label={fetchedByLabel}>
                          <span className="stacked-cell">
                            <strong>{item.actorName || "-"}</strong>
                            <small>
                              {item.actorEmail || ""}
                              {item.actorRole ? ` - ${roleLabels[language][item.actorRole]}` : ""}
                            </small>
                          </span>
                        </td>
                      )}
                      <td data-label={t.createdAt}>{formatShortDate(item.completedAt, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataPanel>

        {verificationModalOpen && (
          <Modal title={directServiceActionLabel} eyebrow={t.submitCheck} onClose={() => {
            setVerificationModalOpen(false);
            if (isEsignWorkflowService) {
              setEsignDocumentFile(null);
            }
          }}>
            <form className="form-grid" onSubmit={submitVerification}>
              {(isEsignWorkflowService || isFaceMatchService) && (
                <label>
                  <span>{text(t, "fullName", "Full Name")}</span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    required
                    disabled={isSubmitting || lockEsignResultForm}
                  />
                </label>
              )}
              {isPrefillService && (
                <>
                  <label><span>First Name</span><input value={experianFirstName} onChange={(event) => setExperianFirstName(event.target.value)} required disabled={isSubmitting} /></label>
                  <label><span>Middle Name</span><input value={middleName} onChange={(event) => setMiddleName(event.target.value)} disabled={isSubmitting} /></label>
                  <label><span>Last Name</span><input value={experianLastName} onChange={(event) => setExperianLastName(event.target.value)} required disabled={isSubmitting} /></label>
                </>
              )}
              {isEsignWorkflowService && (
                <label>
                  <span>{t.email}</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required disabled={isSubmitting || lockEsignResultForm} />
                </label>
              )}
              {isEsignWorkflowService && (
                <label>
                  <span>Document Title</span>
                  <input
                    value={esignDocumentTitle}
                    onChange={(event) => setEsignDocumentTitle(event.target.value)}
                    placeholder="Agreement"
                    required
                    disabled={isSubmitting || lockEsignResultForm}
                  />
                </label>
              )}
              {isEsignWorkflowService && (
                <label className="file-upload-field">
                  <span>PDF Document</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    required
                    disabled={isSubmitting || lockEsignResultForm}
                    onChange={(event) => setEsignDocumentFile(event.target.files?.[0] || null)}
                  />
                  <small>{service === "econsent" ? "Upload a PDF up to 50MB. Signature will be placed on every page." : "Upload a PDF up to 50MB. Signature will be placed on page 1."}</small>
                </label>
              )}
              {!isFaceMatchService && <label>
                <span>{directIdentifierLabel}</span>
                <input
                  value={identifier}
                  onChange={(event) =>
                    setIdentifier(
                      isAadhaarNumberService
                        ? event.target.value.replace(/\D/g, "").slice(0, 12)
                        : isEsignWorkflowService
                          ? event.target.value.replace(/\D/g, "").slice(0, 10)
                          : isMcaCompanyService
                            ? event.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 21)
                          : isPrefillService
                            ? event.target.value.replace(/\D/g, "").slice(0, 10)
                          : isBankVerificationService
                            ? event.target.value.replace(/\D/g, "").slice(0, 18)
                          : isUanNumberService
                            ? event.target.value.replace(/\D/g, "").slice(0, 12)
                            : isGstinService
                              ? event.target.value.toUpperCase().slice(0, 15)
                              : isDrivingLicenseService
                                ? event.target.value.toUpperCase().slice(0, 30)
                              : isRcBasicService
                                ? event.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 15)
                                : event.target.value.toUpperCase().slice(0, 10)
                    )
                  }
                  inputMode={isAadhaarNumberService || isEsignWorkflowService || isUanNumberService || isBankVerificationService || isPrefillService ? "numeric" : undefined}
                  placeholder={config.placeholder}
                  required
                  disabled={isSubmitting || lockEsignResultForm}
                />
              </label>}
              {isFaceMatchService && (
                <>
                  <label className="file-upload-field">
                    <span>Selfie Image</span>
                    <input type="file" accept="image/*" required disabled={isSubmitting} onChange={(event) => setSelfieFile(event.target.files?.[0] || null)} />
                  </label>
                  <label className="file-upload-field">
                    <span>Identity Card Image</span>
                    <input type="file" accept="image/*" required disabled={isSubmitting} onChange={(event) => setCardImageFile(event.target.files?.[0] || null)} />
                  </label>
                </>
              )}
              {isBankVerificationService && (
                <label>
                  <span>IFSC</span>
                  <input
                    name="ifsc"
                    type="text"
                    value={ifsc}
                    onChange={(event) => setIfsc(normalizeIfscCode(event.target.value))}
                    autoComplete="off"
                    placeholder="HDFC0001234"
                    required
                    disabled={isSubmitting}
                  />
                </label>
              )}
              {isDrivingLicenseService && (
                <label>
                  <span>{text(t, "dateOfBirth", "Date of Birth")}</span>
                  <input
                    type="date"
                    value={dob}
                    onChange={(event) => setDob(event.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </label>
              )}
              {(isMcaCompanyService || isPrefillService) && (
                <label><span>Remark (Optional)</span><input value={remark} onChange={(event) => setRemark(event.target.value)} disabled={isSubmitting} placeholder="Client note or reference" /></label>
              )}
              {isEpfoPassbookService && (
                <label>
                  <span>{t.mobileNumber}</span>
                  <input
                    value={mobile}
                    onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
                    inputMode="numeric"
                    placeholder="9876543210"
                    required
                    disabled={isSubmitting}
                  />
                </label>
              )}
            {isAadhaarOtpService && (
              <>
                {aadhaarOtpRequestId && (
                  <label>
                    <span>{t.otp}</span>
                    <input
                      value={aadhaarOtpValue}
                      onChange={(event) => setAadhaarOtpValue(event.target.value.replace(/\D/g, "").slice(0, 8))}
                      inputMode="numeric"
                      placeholder="123456"
                      disabled={isSubmitting}
                    />
                    <small>Enter the OTP received on the linked mobile number.</small>
                  </label>
                )}
              </>
            )}
              {error && <p className="form-error">{error}</p>}
              <button className="primary-button" type="submit" disabled={isSubmitting || lockEsignResultForm}>
                {isSubmitting ? <span className="button-loader" /> : <Zap size={19} />}
                {isSubmitting ? t.loading : isAadhaarOtpService ? (aadhaarOtpRequestId.trim() ? t.verifyOtp : text(t, "generateOtp", "Generate OTP")) : t.submitCheck}
              </button>
            </form>
            {result && (
              <div className="modal-result-block" ref={resultBlockRef}>
                {isEsignWorkflowService ? (
                  <EsignResponseCard source={result} t={t} onFetchStatus={() => refreshVerificationStatus(result.id)} />
                ) : (
                  <VerificationDetailCard service={service} result={result} t={t} />
                )}
              </div>
            )}
          </Modal>
        )}

        {selectedVerification && (
          <Modal
            title={t.verificationResult}
            eyebrow={text(t, config.key, config.key)}
            onClose={() => {
              setSelectedVerification(null);
              setSelectedVerificationLoading(false);
            }}
          >
            {selectedVerificationLoading ? (
              <ResultSkeleton />
            ) : isEsignWorkflowService ? (
              <EsignResponseCard source={selectedVerification} t={t} onFetchStatus={() => refreshVerificationStatus(selectedVerification.id)} />
            ) : (
              <VerificationDetailCard service={service} result={selectedVerification} t={t} />
            )}
            {error && <p className="form-error">{error}</p>}
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="view-stack">
      <section className="page-heading page-heading-compact">
        <div>
          <p className="eyebrow">- {t.service}</p>
          <h1>{text(t, config.key, config.key)}</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => {
          setResult(null);
          setError("");
          setVerificationModalOpen(true);
        }} disabled={!canRunVerification}>
          <Plus size={18} />
          {directServiceActionLabel}
        </button>
      </section>

      {!canRunVerification && (
        <div className="notice-card">
          <Lock size={22} />
          <div>
            <strong>{t.planLocked}</strong>
            <span>{t.planLockedMessage}</span>
          </div>
        </div>
      )}

      <DataPanel
        action={<ListSearch value={verificationSearchQuery} onChange={setVerificationSearchQuery} placeholder={verificationSearchPlaceholder} />}
        footer={!listPending ? <PaginationControls pagination={verificationPagination} t={t} /> : null}
      >
        {listPending ? (
          <TableSkeleton rows={6} />
        ) : displayedVerifications.length === 0 ? (
          <div className="empty-state">{verificationEmptyText}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.customerName}</th>
                  <th>{directIdentifierLabel}</th>
                  {showFetchedByColumn && <th>{fetchedByLabel}</th>}
                  <th>{t.status}</th>
                  <th>{t.createdAt}</th>
                  <th>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {displayedVerifications.map((item) => (
                  <tr className="clickable-row" key={item.id} onClick={() => void openVerificationDetail(item)}>
                    <td data-label={t.customerName}>{item.customerName}</td>
                    <td data-label={directIdentifierLabel}>{item.identifierMasked}</td>
                    {showFetchedByColumn && (
                      <td data-label={fetchedByLabel}>
                        <span className="stacked-cell">
                          <strong>{item.actorName || "-"}</strong>
                          <small>
                            {item.actorEmail || ""}
                            {item.actorRole ? ` - ${roleLabels[language][item.actorRole]}` : ""}
                          </small>
                        </span>
                      </td>
                    )}
                    <td data-label={t.status}>{verificationStatusLabel(item.status, t)}</td>
                    <td data-label={t.createdAt}>{formatShortDate(item.completedAt, language)}</td>
                    <td data-label={t.action} onClick={(event) => event.stopPropagation()}>
                      {isJsonReport ? (
                        <button className="secondary-button compact-action" type="button" onClick={() => void openVerificationDetail(item)}>
                          <FileSpreadsheet size={16} />
                          {text(t, "viewJson", "View JSON")}
                        </button>
                      ) : (
                        <ReportActions result={item} t={t} compact />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>

      {verificationModalOpen && (
        <Modal title={directServiceActionLabel} eyebrow={t.submitCheck} onClose={() => setVerificationModalOpen(false)}>
          <form className="form-grid" onSubmit={submitVerification}>
            {isExperianService ? (
              <>
                <label>
                  <span>First Name</span>
                  <input
                    value={experianFirstName}
                    onChange={(event) => setExperianFirstName(event.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </label>
                <label>
                  <span>Last Name</span>
                  <input
                    value={experianLastName}
                    onChange={(event) => setExperianLastName(event.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </label>
              </>
            ) : (
              <label>
                <span>{t.customerName}</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required disabled={isSubmitting} />
              </label>
            )}<label>
              <span>{text(t, "mobileNumber", "Mobile Number")}</span>
              <input
                value={mobile}
                onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                inputMode="numeric"
                required
                disabled={isSubmitting}
              />
            </label>
            {requiresPan && (
              <label>
                <span>{t.panNumber}</span>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value.toUpperCase().slice(0, 10))}
                  placeholder="ABCDE1234F"
                  required
                  disabled={isSubmitting}
                />
              </label>
            )}
            {!isCrifService && !isExperianService && (
              <label>
                <span>{text(t, "gender", "Gender")}</span>
                <select value={gender} onChange={(event) => setGender(event.target.value)} disabled={isSubmitting}>
                  <option value="male">{text(t, "male", "Male")}</option>
                  <option value="female">{text(t, "female", "Female")}</option>
                  <option value="other">{text(t, "other", "Other")}</option>
                </select>
              </label>
            )}
            {isEquifaxService && (
              <>
                <label>
                  <span>{t.dateOfBirth}</span>
                  <input
                    value={dob}
                    onChange={(event) => setDob(formatDobInput(event.target.value))}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="DD/MM/YYYY"
                    required
                    disabled={isSubmitting}
                  />
                </label>
                <label>
                  <span>{text(t, "address", "Address")}</span>
                  <input value={address} onChange={(event) => setAddress(event.target.value)} required disabled={isSubmitting} />
                </label>
                <label>
                  <span>{text(t, "state", "State")}</span>
                  <select
                    value={stateCode}
                    onChange={(event) => setStateCode(event.target.value)}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">{text(t, "state", "State")}</option>
                    {indianStateOptions.map((state) => (
                      <option value={state.code} key={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{text(t, "pincode", "Pincode")}</span>
                  <input
                    value={pincode}
                    onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    disabled={isSubmitting}
                  />
                </label>
              </>
            )}
            {isCrifJsonService && (
              <label>
                <span>{t.dateOfBirth}</span>
                <input
                  value={dob}
                  onChange={(event) => setDob(formatDobInput(event.target.value))}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="DD/MM/YYYY"
                  required
                  disabled={isSubmitting}
                />
              </label>
            )}
            {isExperianService && (
              <>
                <label>
                  <span>{t.email}</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required disabled={isSubmitting} />
                </label>
                <label>
                  <span>{t.dateOfBirth}</span>
                  <input value={dob} onChange={(event) => setDob(formatDobInput(event.target.value))} inputMode="numeric" maxLength={10} placeholder="DD/MM/YYYY" required disabled={isSubmitting} />
                </label>
                <label>
                  <span>{text(t, "address", "Address")}</span>
                  <input value={address} onChange={(event) => setAddress(event.target.value)} required disabled={isSubmitting} />
                </label>
                <label>
                  <span>{text(t, "pincode", "Pincode")}</span>
                  <input value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="452001" inputMode="numeric" maxLength={6} required disabled={isSubmitting} />
                </label>
              </>
            )}
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button" type="submit" disabled={!canRunVerification || isSubmitting}>
              {isSubmitting ? <span className="button-loader" /> : <Zap size={19} />}
              {isSubmitting
                ? t.loading
                : isAadhaarOtpService
                    ? (aadhaarOtpRequestId ? t.verifyOtp : "Generate OTP")
                    : t.submitCheck}
            </button>
          </form>
          {isSubmitting && (
            <ResultSkeleton />
          )}
          {result && (
            <div className="modal-result-block" ref={resultBlockRef}>
              <VerificationDetailCard service={service} result={result} t={t} />
            </div>
          )}
        </Modal>
      )}

      {selectedVerification && (
        <Modal
          title={isJsonReport ? text(t, "viewJson", "View JSON") : t.verificationResult}
          eyebrow={text(t, config.key, config.key)}
          onClose={() => {
            setSelectedVerification(null);
            setSelectedVerificationLoading(false);
          }}
        >
          {selectedVerificationLoading ? (
            <ResultSkeleton />
          ) : (
            <VerificationDetailCard service={service} result={selectedVerification} t={t} />
          )}
          {error && <p className="form-error">{error}</p>}
        </Modal>
      )}
    </div>
  );
}

function ReportActions({ result, t, compact = false, force = false }: { result: VerificationResult; t: Record<string, string>; compact?: boolean; force?: boolean }) {
  const [loadingReport, setLoadingReport] = useState(false);
  const canLoadReport = Boolean(result.reportFileDataUrl || result.hasReportFile);
  if (!canLoadReport && !force) return <span>-</span>;

  async function withReport(action: (report: VerificationResult) => void) {
    if (loadingReport) return;
    setLoadingReport(true);
    try {
      const report = result.reportFileDataUrl ? result : await api.verificationDetail(verificationServicePath(result), result.id);
      if (!reportFileUrl(report)) {
        window.alert(text(t, "downloadReport", "Download Report") + " unavailable");
        return;
      }
      action(report);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : t.error);
    } finally {
      setLoadingReport(false);
    }
  }

  return (
    <div className={compact ? "inline-actions" : "report-actions"}>
      <button
        className="secondary-button"
        type="button"
        disabled={loadingReport}
        onClick={(event) => {
          event.stopPropagation();
          void withReport(openReportFile);
        }}
        title={text(t, "viewReport", "View Report")}
        aria-label={text(t, "viewReport", "View Report")}
      >
        {loadingReport ? <span className="button-loader" /> : <FileCheck2 size={17} />}
        {!compact && text(t, "viewReport", "View Report")}
      </button>
      <button
        className="primary-button"
        type="button"
        disabled={loadingReport}
        onClick={(event) => {
          event.stopPropagation();
          void withReport(downloadReportFile);
        }}
        title={text(t, "downloadReport", "Download Report")}
        aria-label={text(t, "downloadReport", "Download Report")}
      >
        <FileDown size={17} />
        {!compact && text(t, "downloadReport", "Download Report")}
      </button>
    </div>
  );
}

function verificationServicePath(result: VerificationResult): ServiceKind {
  const service = String(result.service || "").toLowerCase();
  if (service === "pan" || service === "aadhaar" || service === "aadhaar-validation" || service === "aadhaar-otp" || service === "uan-fetch-by-pan" || service === "uan-profile-details" || service === "employment-history" || service === "epfo-passbook" || service === "gstin-verification" || service === "bank-verification" || service === "driving-license" || service === "rc-basic" || service === "face-match" || service === "esign" || service === "econsent" || service === "cibil" || service === "cibil-json" || service === "equifax-cibil" || service === "equifax-cibil-json" || service === "crif" || service === "crif-json" || service === "experian-json" || service === "experian-pdf") {
    return service;
  }
  if (service === "cibil_json") return "cibil-json";
  if (service === "equifax") return "equifax-cibil";
  if (service === "equifax_json") return "equifax-cibil-json";
  if (service === "crif_json") return "crif-json";
  if (service === "experian_json" || service === "experian_credit_report") return "experian-json";
  if (service === "experian_pdf") return "experian-pdf";
  if (service === "face_match") return "face-match";
  if (service === "aadhaar") return "aadhaar";
  return "cibil";
}

function openReportFile(result: VerificationResult) {
  const url = reportFileUrl(result);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
  revokeObjectUrlLater(url);
}

function downloadReportFile(result: VerificationResult) {
  const url = reportFileUrl(result);
  if (!url) return;
  const link = document.createElement("a");
  link.href = url;
  link.download = result.reportFileName || "cibil-report.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  revokeObjectUrlLater(url);
}

function reportFileUrl(result: VerificationResult) {
  const source = result.reportFileDataUrl || "";
  if (!source.startsWith("data:")) return source;

  const [header, data = ""] = source.split(",");
  const mime = header.match(/^data:([^;]+)/)?.[1] || result.reportContentType || "application/pdf";
  const binary = header.includes(";base64") ? window.atob(data) : decodeURIComponent(data);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

function revokeObjectUrlLater(url: string) {
  if (url.startsWith("blob:")) {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

function KycEsignActionCard({
  source,
  t,
  onContinue,
  checking = false
}: {
  source: unknown;
  t: Record<string, string>;
  onContinue?: () => void;
  checking?: boolean;
}) {
  return (
    <article className="kyc-esign-action-card">
      <div>
        <strong>{text(t, "aadhaarEsign", "Aadhaar eSign")}</strong>
        <span>{text(t, "completeAadhaarEsignNote", "Please complete Aadhaar eSign by clicking the button below.")}</span>
      </div>
      <EsignOpenButton source={source} t={t} />
      <button className="secondary-button" type="button" disabled={!onContinue || checking} onClick={onContinue}>
        {checking ? <span className="button-loader dark" /> : <Clock3 size={18} />}
        {checking ? t.loading : text(t, "checkEsignStatus", "Check eSign Status")}
      </button>
    </article>
  );
}

function EsignResponseCard({
  source,
  t,
  onFetchStatus
}: {
  source: unknown;
  t: Record<string, string>;
  onFetchStatus?: () => Promise<void> | void;
}) {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const isIndisign = esignIsIndisign(source);
  const isEConsent = esignIsEConsent(source);
  const requiresApproval = esignRequiresApproval(source);
  const verified = esignIsVerified(source);

  async function fetchStatus() {
    if (!onFetchStatus || fetching) return;
    setFetching(true);
    setError("");
    try {
      await onFetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!isEConsent || !onFetchStatus) return undefined;

    let active = true;
    const fetcher = onFetchStatus;
    async function handleEConsentMessage(event: MessageEvent) {
      if (event.origin !== "https://service.algebrasoftech.com") return;
      const payload = event.data as { type?: string } | null;
      if (!payload || payload.type !== "ECONSENT_SIGN_COMPLETE") return;

      setFetching(true);
      setError("");
      try {
        await fetcher();
        if (active) window.alert("Document has been verified.");
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : t.error);
      } finally {
        if (active) setFetching(false);
      }
    }

    window.addEventListener("message", handleEConsentMessage);
    return () => {
      active = false;
      window.removeEventListener("message", handleEConsentMessage);
    };
  }, [isEConsent, onFetchStatus, t.error]);

  return (
    <article className="kyc-info-card">
      <h3>{text(t, "esignResponse", "eSign Response")}</h3>
      <dl className="profile-list">
        <div>
          <dt>{t.status}</dt>
          <dd>{esignStatusLabel(source, t)}</dd>
        </div>
        <div>
          <dt>{isIndisign ? "Envelope ID" : text(t, "documentId", "Document ID")}</dt>
          <dd>{esignDocumentId(source)}</dd>
        </div>
        {(isIndisign || isEConsent) && (
          <>
            <div>
              <dt>{isEConsent ? "Signer" : "Recipient"}</dt>
              <dd>{esignSourceValue(source, ["recipientName", "name"]) || "-"}</dd>
            </div>
            <div>
              <dt>{t.email}</dt>
              <dd>{esignSourceValue(source, ["recipientEmail", "email"]) || "-"}</dd>
            </div>
            <div>
              <dt>{t.mobileNumber}</dt>
              <dd>{esignSourceValue(source, ["recipientPhone", "phone"]) || "-"}</dd>
            </div>
            <div>
              <dt>Document</dt>
              <dd>{esignSourceValue(source, ["documentTitle", "title", "fileName"]) || "-"}</dd>
            </div>
            {!isEConsent && (
              <div>
                <dt>Signed</dt>
                <dd>{esignSignedProgress(source)}</dd>
              </div>
            )}
            {isIndisign && (
              <div>
                <dt>Email</dt>
                <dd>{esignEmailDeliveryText(source)}</dd>
              </div>
            )}
            {requiresApproval && (
              <div>
                <dt>Approval ID</dt>
                <dd>{esignApprovalId(source)}</dd>
              </div>
            )}
          </>
        )}
      </dl>
      {isIndisign && requiresApproval && (
        <p className="esign-note">IndiSign approval is required. Approve this envelope in the IndiSign dashboard; the signing email will be sent after approval.</p>
      )}
      {isIndisign && !requiresApproval && !esignIsVerified(source) && (
        <p className="esign-note">Signing email has been sent to the recipient. Ask them to complete Aadhaar eSign from their email, then fetch document status.</p>
      )}
      {isEConsent && !esignIsVerified(source) && (
        <p className="esign-note">Open the e-Consent signing URL, complete Aadhaar e-Consent, then fetch document status.</p>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="esign-action-row">
        <EsignOpenButton source={source} t={t} />
        <EsignShareButton source={source} t={t} />
        {!verified && (
          <button className="secondary-button esign-status-button" type="button" disabled={!onFetchStatus || fetching} onClick={fetchStatus}>
            {fetching ? <span className="button-loader" /> : <Clock3 size={18} />}
            {fetching ? t.loading : text(t, "fetchDocumentStatus", "Fetch Document Status")}
          </button>
        )}
        <EsignDownloadButton source={source} t={t} />
        <EsignAuditTrailButton source={source} t={t} />
      </div>
    </article>
  );
}

function EsignShareButton({ source, t }: { source: unknown; t: Record<string, string> }) {
  const [sharing, setSharing] = useState(false);
  const result = source as VerificationResult;
  if (!esignIsEConsent(source) || esignIsVerified(source)) return null;

  return (
    <button
      className="secondary-button esign-status-button"
      type="button"
      disabled={sharing}
      onClick={async () => {
        setSharing(true);
        try {
          const response = await api.shareEConsent(result.id);
          const details = (response.details || {}) as Record<string, unknown>;
          const shareUrl = String(details.shareUrl || details.signUrl || esignSigningUrl(response) || "").trim();
          if (!shareUrl) {
            window.alert("e-Consent share link is not available.");
            return;
          }
          try {
            await navigator.clipboard.writeText(shareUrl);
            window.alert("e-Consent share link copied.");
          } catch {
            window.prompt("Copy e-Consent share link", shareUrl);
          }
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "Unable to share e-Consent link");
        } finally {
          setSharing(false);
        }
      }}
    >
      {sharing ? <span className="button-loader dark" /> : <ArrowRight size={18} />}
      {sharing ? t.loading : text(t, "shareEConsent", "Share e-Consent")}
    </button>
  );
}

function EsignOpenButton({ source, t }: { source: unknown; t: Record<string, string> }) {
  const signingUrl = esignSigningUrl(source);
  const isEConsent = esignIsEConsent(source);
  const label = isEConsent ? text(t, "openEConsent", "Open e-Consent") : text(t, "openAadhaarEsign", "Open Aadhaar eSign");
  if (!signingUrl && esignIsIndisign(source)) return null;
  const verified = esignIsVerified(source);
  const expired = esignIsExpired(source);
  const disabledReason = verified
    ? text(t, "esignVerifiedMessage", "Document has already been verified.")
    : expired
      ? text(t, "esignExpiredMessage", "24 hours have passed. Please create a new eSign request.")
      : !signingUrl
        ? text(t, "esignLinkUnavailable", "eSign link is not available in the provider response.")
        : "";

  return (
    <button
      className={`primary-button esign-open-button${disabledReason ? " is-disabled" : ""}`}
      type="button"
      aria-disabled={Boolean(disabledReason)}
      title={disabledReason || label}
      onClick={() => {
        if (disabledReason) {
          window.alert(disabledReason);
          return;
        }
        if (isEConsent) {
          window.open(signingUrl, "_blank");
          return;
        }
        window.open(signingUrl, "_blank", "noopener,noreferrer");
      }}
    >
      <ArrowRight size={18} />
      {label}
    </button>
  );
}

function EsignDownloadButton({ source, t }: { source: unknown; t: Record<string, string> }) {
  const [downloading, setDownloading] = useState(false);
  const result = source as VerificationResult;
  const isEConsent = esignIsEConsent(source);
  const hasEmbeddedReport = Boolean(result?.reportFileDataUrl);
  const signedDocumentUrl = esignSignedDocumentUrl(source) || esignPublicDocumentUrl(source);
  if (!esignIsVerified(source) || (!isEConsent && !hasEmbeddedReport && !signedDocumentUrl)) return null;

  return (
    <button
      className="secondary-button esign-download-button"
      type="button"
      disabled={downloading}
      onClick={async () => {
        if (isEConsent) {
          if (downloading) return;
          setDownloading(true);
          try {
            const blob = await api.downloadEsignSignedDocument(result.id, "econsent");
            downloadBlob(blob, result.reportFileName || `econsent-signed-document-${result.providerReference || result.id}.pdf`);
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "Unable to download signed document");
          } finally {
            setDownloading(false);
          }
          return;
        }
        if (hasEmbeddedReport) {
          downloadReportFile(result);
          return;
        }
        window.open(signedDocumentUrl, "_blank", "noopener,noreferrer");
      }}
    >
      {downloading ? <span className="button-loader dark" /> : <FileDown size={18} />}
      {downloading ? t.loading : text(t, "downloadSignedDocument", "Download Signed Document")}
    </button>
  );
}

function EsignAuditTrailButton({ source, t }: { source: unknown; t: Record<string, string> }) {
  const result = source as VerificationResult;
  const details = esignDetails(source);
  if (!esignIsEConsent(source) || !esignIsVerified(source)) return null;

  return (
    <button
      className="secondary-button esign-download-button"
      type="button"
      onClick={async () => {
        try {
          const blob = await api.downloadEsignAuditTrail(result.id, "econsent");
          const fileName = String(details.auditTrailFileName || `econsent-audit-trail-${result.providerReference || result.id}.pdf`);
          downloadBlob(blob, fileName);
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "Unable to download audit trail");
        }
      }}
    >
      <FileDown size={18} />
      {text(t, "downloadAuditTrail", "Download Audit Trail")}
    </button>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function openBlobInWindow(blob: Blob, fileName: string, targetWindow: Window | null) {
  const url = URL.createObjectURL(new Blob([blob], { type: blob.type || "application/pdf" }));
  if (targetWindow) {
    targetWindow.document.title = fileName;
    targetWindow.location.href = url;
  } else {
    window.alert("Popup was blocked. Please allow popups to view the invoice.");
    downloadBlob(blob, fileName);
  }
  revokeObjectUrlLater(url);
}

function ReportsView({ language, t }: { language: Language; t: Record<string, string> }) {
  const [dateFrom, setDateFrom] = useState(monthStartInputValue());
  const [dateTo, setDateTo] = useState(todayInputValue());
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [report, setReport] = useState<UsageReportPayload | null>(null);
  const [reportTotal, setReportTotal] = useState(0);
  const [loadingReport, setLoadingReport] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [error, setError] = useState("");
  const reportPagination = useServerPagination<UsageReportRecord>(
    `usage-report:${dateFrom}:${dateTo}:${selectedUserId}:${selectedService}`,
    reportTotal
  );

  async function fetchReport(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const nextPage = event ? 1 : reportPagination.page;
    if (event) reportPagination.setPage(1);
    setLoadingReport(true);
    setError("");
    try {
      const response = await api.usageReport({
        dateFrom,
        dateTo,
        userId: selectedUserId,
        service: selectedService,
        page: nextPage,
        limit: reportPagination.pageSize
      });
      setReport(response);
      setReportTotal(response.records.pagination.total);
    } catch (err) {
      setError(getDisplayError(err, t.error));
      setReport(null);
      setReportTotal(0);
    } finally {
      setLoadingReport(false);
    }
  }

  async function downloadReport() {
    setDownloadingReport(true);
    setError("");
    try {
      const blob = await api.downloadUsageReport({
        dateFrom,
        dateTo,
        userId: selectedUserId,
        service: selectedService
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finrep-report-${todayInputValue()}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getDisplayError(err, t.error));
    } finally {
      setDownloadingReport(false);
    }
  }

  useEffect(() => {
    fetchReport();
  }, [reportPagination.page, reportPagination.pageSize]);

  return (
    <div className="view-stack reports-view">
      <section className="page-heading">
        <div>
          <p className="eyebrow">- REPORT</p>
          <h1>{text(t, "reports", "Reports")}</h1>
        </div>
        <button className="primary-button" type="button" onClick={downloadReport} disabled={downloadingReport || loadingReport}>
          {downloadingReport ? <span className="button-loader" /> : <FileDown size={18} />}
          Download Excel
        </button>
      </section>

      <DataPanel
        action={
          <form className="report-filter-bar" onSubmit={fetchReport}>
            <label className="modern-date-field">
              <span>From</span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="modern-date-field">
              <span>To</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <label className="modern-select-field">
              <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                <option value="">All Users</option>
                {(report?.users || []).map((account) => (
                  <option value={account.id} key={account.id}>
                    {account.name} - {account.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="modern-select-field">
              <select value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>
                <option value="">All APIs</option>
                {(report?.services || []).map((service) => (
                  <option value={service.value} key={service.value}>
                    {service.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={loadingReport}>
              {loadingReport ? <span className="button-loader" /> : <Search size={18} />}
              Fetch Report
            </button>
          </form>
        }
        footer={!loadingReport ? <PaginationControls pagination={reportPagination} t={t} /> : null}
      >
        {error && <p className="form-error">{error}</p>}
        {loadingReport && !report ? (
          <TableSkeleton rows={6} />
        ) : !report || report.records.items.length === 0 ? (
          <div className="empty-state">{t.noData}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>API</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Request UID</th>
                </tr>
              </thead>
              <tbody>
                {report.records.items.map((record) => (
                  <tr key={record.id}>
                    <td data-label="Date">
                      {formatShortDate(record.createdAt, language)}
                      <small>{formatShortTime(record.createdAt)}</small>
                    </td>
                    <td data-label="User">
                      <strong>{record.actorName || "-"}</strong>
                      <small>{record.actorEmail}</small>
                    </td>
                    <td data-label="API">{record.serviceLabel}</td>
                    <td data-label="Customer">
                      <strong>{record.customerName}</strong>
                      <small>{record.identifierMasked}</small>
                    </td>
                    <td data-label="Status">
                      <Badge tone={record.status === "verified" ? "success" : record.status === "pending" ? "muted" : "neutral"}>
                        {record.status}
                      </Badge>
                    </td>
                    <td data-label="Request UID">{record.providerReference || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>
    </div>
  );
}
function ActivityView({
  language,
  t,
  user,
  activities,
  loading
}: {
  language: Language;
  t: Record<string, string>;
  user: UserAccount;
  activities: ActivityItem[];
  loading: boolean;
}) {
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const debouncedActivitySearch = useDebouncedValue(activitySearchQuery, 300);
  const [serverActivities, setServerActivities] = useState<ActivityItem[]>(activities);
  const [activityTotal, setActivityTotal] = useState(activities.length);
  const [activityLoading, setActivityLoading] = useState(loading);
  const activityPagination = useServerPagination<ActivityItem>(
    `activity-logs:${user.id}:${debouncedActivitySearch}:${dateFrom}:${dateTo}`,
    activityTotal
  );

  useEffect(() => {
    let mounted = true;
    setActivityLoading(true);
    api.activityPage({
      page: activityPagination.page,
      limit: activityPagination.pageSize,
      search: debouncedActivitySearch,
      dateFrom,
      dateTo
    })
      .then((response) => {
        if (mounted) {
          setServerActivities(response.items);
          setActivityTotal(response.pagination.total);
        }
      })
      .catch(() => {
        if (mounted) {
          setServerActivities([]);
          setActivityTotal(0);
        }
      })
      .finally(() => {
        if (mounted) setActivityLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activityPagination.page, activityPagination.pageSize, debouncedActivitySearch, dateFrom, dateTo, user.id]);

  return (
    <div className="view-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">- {t.activityLogs}</p>
          <h1>{t.recentActivity}</h1>
        </div>
      </section>

      <DataPanel
        action={
          <div className="activity-filter-bar">
            <ListSearch value={activitySearchQuery} onChange={setActivitySearchQuery} placeholder={t.searchActivityLogs} />
            <label className="modern-date-field">
              <span>From</span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="modern-date-field">
              <span>To</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            {(dateFrom || dateTo) && (
              <button className="secondary-button" type="button" onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}>
                Clear
              </button>
            )}
          </div>
        }
        footer={!activityLoading ? <PaginationControls pagination={activityPagination} t={t} /> : null}
      >
        {activityLoading ? (
          <TableSkeleton rows={6} />
        ) : serverActivities.length === 0 ? (
          <div className="empty-state">{debouncedActivitySearch.trim() ? t.noSearchResults : t.noData}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.actor}</th>
                  <th>{t.role}</th>
                  <th>{t.action}</th>
                  <th>{t.service}</th>
                  <th>{text(t, "date", "Date")}</th>
                  <th>{t.time}</th>
                </tr>
              </thead>
              <tbody>
                {serverActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td data-label={t.actor}>{activity.actor}</td>
                    <td data-label={t.role}>{roleLabels[language][activity.role]}</td>
                    <td data-label={t.action}>{activity.action}</td>
                    <td data-label={t.service}>{activity.service}</td>
                    <td data-label={text(t, "date", "Date")}>{formatShortDate(activity.createdAt, language)}</td>
                    <td data-label={t.time}>{formatShortTime(activity.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataPanel>
    </div>
  );
}

function VerificationDetailCard({ service, result, t }: { service: ServiceKind; result: VerificationResult; t: Record<string, string> }) {
  const details = result.details || {};
  const isReportService = isCreditReportService(service);
  const isJsonReport = isJsonReportService(service);
  const isCrifReport = service === "crif" || service === "crif-json";
  const panProviderResponse = details.providerResponse && typeof details.providerResponse === "object"
    ? details.providerResponse as Record<string, unknown>
    : {};
  const readPanDetailValue = (keys: string[]) => {
    const providerValue = findNestedProviderValue(panProviderResponse, keys);
    if (providerValue !== undefined && providerValue !== null && providerValue !== "") return providerValue;
    return findNestedProviderValue(details, keys);
  };
  const panValue = (keys: string[]) => {
    const value = readPanDetailValue(keys);
    return value === undefined || value === null ? "" : String(value).replace(/\s+/g, " ").trim();
  };
  const listValue = (keys: string[]) => {
    const value = readPanDetailValue(keys);
    if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
    const normalized = value === undefined || value === null ? "" : String(value).trim();
    return normalized ? normalized.split(",").map((item) => item.trim()).filter(Boolean) : [];
  };
  const employmentData = readPanDetailValue(["employment_data", "employmentData"]);
  const employmentRecords = Array.isArray(employmentData)
    ? employmentData.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  const recordValue = (record: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== "") return String(value).replace(/\s+/g, " ").trim();
    }
    return "-";
  };
  const panBooleanValue = (keys: string[]) => {
    const value = readPanDetailValue(keys);
    const normalized = String(value).toLowerCase();
    if (normalized === "true") return "Yes";
    if (normalized === "false") return "No";
    return value === undefined || value === null || value === "" ? "" : String(value);
  };
  const panDataValue = readPanDetailValue(["pan_data", "panData"]);
  const panData = panDataValue && typeof panDataValue === "object" && !Array.isArray(panDataValue)
    ? panDataValue as Record<string, unknown>
    : {};
  const panRecordValue = (keys: string[]) => {
    for (const key of keys) {
      const value = panData[key];
      if (value !== undefined && value !== null && value !== "") return String(value).replace(/\s+/g, " ").trim();
    }
    return panValue(keys);
  };
  const panRecordBooleanValue = (keys: string[]) => {
    for (const key of keys) {
      const value = panData[key];
      if (value === true || String(value).toLowerCase() === "true" || String(value).toUpperCase() === "Y") return "Yes";
      if (value === false || String(value).toLowerCase() === "false" || String(value).toUpperCase() === "N") return "No";
      if (value !== undefined && value !== null && value !== "") return String(value);
    }
    return panBooleanValue(keys);
  };
  const rcOwner = (details.owner && typeof details.owner === "object" ? details.owner : {}) as Record<string, unknown>;
  const rcVehicle = (details.vehicle && typeof details.vehicle === "object" ? details.vehicle : {}) as Record<string, unknown>;
  const rcRegistration = (details.registration && typeof details.registration === "object" ? details.registration : {}) as Record<string, unknown>;
  const rcInsurance = (details.insurance && typeof details.insurance === "object" ? details.insurance : {}) as Record<string, unknown>;
  const rcFinance = (details.finance && typeof details.finance === "object" ? details.finance : {}) as Record<string, unknown>;
  const rcPucc = (details.pucc && typeof details.pucc === "object" ? details.pucc : {}) as Record<string, unknown>;
  const rcStatusDetails = (details.statusDetails && typeof details.statusDetails === "object" ? details.statusDetails : {}) as Record<string, unknown>;
  const reportRows = [
    [t.status, verificationStatusLabel(result.status, t)],
    [t.customerName, String(result.customerName || "-")],
    !isCrifReport ? [t.panNumber, String(result.identifierMasked || details.panNumber || "-")] : null,
    [text(t, "mobileNumber", "Mobile Number"), String(details.mobile || (isCrifReport ? result.identifierMasked : "-"))],
    details.gender ? [text(t, "gender", "Gender"), String(details.gender)] : null,
    details.dob ? [t.dateOfBirth, String(details.dob)] : null,
    details.address ? [text(t, "address", "Address"), String(details.address)] : null,
    details.state ? [text(t, "state", "State"), String(details.state)] : null,
    details.pincode ? [text(t, "pincode", "Pincode"), String(details.pincode)] : null,
    [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
    !isJsonReport ? [text(t, "riskBand", "Risk Band"), String(details.riskBand || result.riskBand || "-")] : null
  ].filter((row): row is [string, string] => Boolean(row));
  const detailRows =
    service === "mca-company"
      ? (() => {
          const company = (details.companyInfo && typeof details.companyInfo === "object" ? details.companyInfo : {}) as Record<string, unknown>;
          const directors = Array.isArray(details.directors) ? details.directors as Array<Record<string, unknown>> : [];
          return [
            [t.status, verificationStatusLabel(result.status, t)],
            [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
            ["Company Name", String(company.company_name || company.companyName || result.customerName || "-")],
            ["CIN", String(company.cin || details.cin || result.identifierMasked || "-")],
            ["Company Status", String(company.company_status || company.companyStatus || "-")],
            ["Company Type", String(details.companyType || "-")],
            ["Category", String(company.company_category || company.companyCategory || "-")],
            ["Class", String(company.class_of_company || company.classOfCompany || "-")],
            ["ROC", String(company.roc_code || company.rocCode || "-")],
            ["Incorporated On", String(company.date_of_incorporation || company.dateOfIncorporation || "-")],
            ["Registered Address", String(company.registered_address || company.registeredAddress || "-")],
            ["Company Email", String(company.email_id || company.emailId || "-")],
            ["Authorized Capital", String(company.authorized_capital || company.authorizedCapital || "-")],
            ["Paid-up Capital", String(company.paid_up_capital || company.paidUpCapital || "-")],
            ["Directors", directors.length ? directors.map((director) => `${director.director_name || director.directorName || "-"} (${director.din_number || director.dinNumber || "-"})`).join(", ") : "-"]
          ];
        })()
      : service === "prefill"
        ? (() => {
            const identities = (details.identityInfo && typeof details.identityInfo === "object" ? details.identityInfo : {}) as Record<string, unknown>;
            const panIds = Array.isArray(identities.PANId) ? identities.PANId as Array<Record<string, unknown>> : [];
            const addresses = Array.isArray(details.addresses) ? details.addresses as Array<Record<string, unknown>> : [];
            const phones = Array.isArray(details.phones) ? details.phones as Array<Record<string, unknown>> : [];
            const emails = Array.isArray(details.emails) ? details.emails as Array<Record<string, unknown>> : [];
            return [
              [t.status, verificationStatusLabel(result.status, t)],
              [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
              [text(t, "fullName", "Full Name"), String(details.fullName || result.customerName || "-")],
              [t.dateOfBirth, String(details.dob || "-")],
              ["Age", String(details.age || "-")],
              [t.panNumber, panIds.map((item) => String(item.IdNumber || item.idNumber || "")).filter(Boolean).join(", ") || "-"],
              [text(t, "address", "Address"), addresses.map((item) => String(item.Address || item.address || "")).filter(Boolean).join(" | ") || "-"],
              [text(t, "mobileNumber", "Mobile Number"), phones.map((item) => String(item.Number || item.number || "")).filter(Boolean).join(", ") || "-"],
              [t.email, emails.map((item) => String(item.EmailAddress || item.emailAddress || "")).filter(Boolean).join(", ") || "-"]
            ];
          })()
        : service === "face-match"
      ? [
          [t.status, verificationStatusLabel(result.status, t)],
          [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
          [text(t, "customerName", "Customer Name"), String(result.customerName || "-")],
          ["Match Result", String(details.statusDetail || details.status || result.riskBand || "-")],
          ["Same Face", String(details.sameFace ?? "-")],
          ["Confidence", String(details.confidence ?? "-")],
          ["Person Image Blur", String(details.personImageBlur ?? "-")],
          ["Card Image Blur", String(details.cardImageBlur ?? "-")]
        ]
      :
    service === "aadhaar"
      ? [
          [t.status, verificationStatusLabel(result.status, t)],
          [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
          [t.aadhaarNumber, String(details.aadhaarNumber || result.identifierMasked || "-")],
          [text(t, "lastMobileDigits", "Last Mobile Digits"), String(details.lastMobileDigits || "-")],
          [text(t, "ageRange", "Age Range"), String(details.ageRange || "-")],
          [t.status, String(details.statusDetail || details.remarks || details.status || result.riskBand || "-")]
        ]
      : service === "esign" || service === "econsent"
        ? [
            [t.status, verificationStatusLabel(result.status, t)],
            [text(t, "clientId", "Client ID"), String(result.providerReference || "-")],
            [text(t, "fullName", "Full Name"), String(details.name || result.customerName || "-")],
            [t.email, String(details.email || "-")],
            [t.mobileNumber, String(details.phone || result.identifierMasked || "-")],
            [text(t, "documentTitle", "Document Title"), String(details.documentTitle || "-")],
            service === "econsent" ? [text(t, "transactionId", "Transaction ID"), String(details.transactionId || "-")] : null,
            service === "econsent" ? [text(t, "signUrl", "Sign URL"), String(details.signUrl || "-")] : null
          ]
            .filter((row): row is [string, string] => Boolean(row))
        : service === "aadhaar-validation"
          ? [
              [t.status, verificationStatusLabel(result.status, t)],
              [t.aadhaarNumber, String(details.aadhaarNumber || result.identifierMasked || "-")],
              [text(t, "message", "Message"), String(details.statusDetail || details.status || result.riskBand || "-")]
            ]
        : service === "aadhaar-otp"
          ? [
              [t.status, verificationStatusLabel(result.status, t)],
              [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
              [t.aadhaarNumber, String(details.aadhaarNumber || result.identifierMasked || "-")],
              [text(t, "fullName", "Full Name"), String(details.fullName || result.customerName || "-")],
              [text(t, "dateOfBirth", "Date of Birth"), String(details.dob || "-")],
              [text(t, "gender", "Gender"), String(details.gender || "-")],
              [text(t, "pincode", "Pincode"), String(details.pincode || "-")],
              [text(t, "careOf", "Care Of"), String(details.careOf || "-")],
              [text(t, "address", "Address"), String(details.address || "-")],
              [text(t, "street", "Street"), String(details.street || "-")],
              [text(t, "locality", "Locality"), String(details.locality || "-")],
              [text(t, "vtc", "VTC"), String(details.vtc || "-")],
              [text(t, "postOffice", "Post Office"), String(details.postOffice || "-")],
              [text(t, "subDistrict", "Sub District"), String(details.subDistrict || "-")],
              [text(t, "district", "District"), String(details.district || "-")],
              [text(t, "state", "State"), String(details.state || "-")],
              [text(t, "country", "Country"), String(details.country || "-")],
              [text(t, "message", "Message"), String(details.statusDetail || details.status || result.riskBand || "-")]
            ]
        : service === "gstin-verification"
          ? [
              [t.status, verificationStatusLabel(result.status, t)],
              [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
              ["GSTIN", String(details.gstin || result.identifierMasked || "-")],
              [text(t, "businessName", "Business Name"), String(details.businessName || result.customerName || "-")],
              [text(t, "legalName", "Legal Name"), String(details.legalName || "-")],
              [t.panNumber, String(details.panNumber || "-")],
              ["GSTIN Status", String(details.gstinStatus || details.statusDetail || "-")],
              ["Taxpayer Type", String(details.taxpayerType || "-")],
              ["Constitution", String(details.constitutionOfBusiness || "-")],
              ["Registration Date", String(details.dateOfRegistration || "-")],
              ["Cancellation Date", String(details.dateOfCancellation || "-")],
              [text(t, "address", "Address"), String(details.address || "-")],
              ["Center Jurisdiction", String(details.centerJurisdiction || "-")],
              ["State Jurisdiction", String(details.stateJurisdiction || "-")],
              ["Business Activities", Array.isArray(details.natureBusActivities) ? details.natureBusActivities.join(", ") || "-" : String(details.natureBusActivities || "-")],
              ["Aadhaar Validation", String(details.aadhaarValidation || "-")],
              [text(t, "message", "Message"), String(details.status || result.riskBand || "-")]
            ]
        : service === "bank-verification"
          ? [
              [t.status, verificationStatusLabel(result.status, t)],
              [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
              ["Account Number", String(details.accountNumber || result.identifierMasked || "-")],
              ["IFSC", String(details.ifsc || "-")],
              ["Account Exists", details.accountExists === true ? "Yes" : details.accountExists === false ? "No" : String(details.accountExists || "-")],
              [text(t, "fullName", "Full Name"), String(details.fullName || result.customerName || "-")],
              ["UPI ID", String(details.upiId || "-")],
              [text(t, "message", "Message"), String(details.remarks || details.status || result.riskBand || "-")]
            ]
        : service === "driving-license"
          ? [
              [t.status, verificationStatusLabel(result.status, t)],
              [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
              ["Driving License Number", String(details.licenseNumber || result.identifierMasked || "-")],
              [text(t, "fullName", "Full Name"), String(details.fullName || result.customerName || "-")],
              [text(t, "dateOfBirth", "Date of Birth"), String(details.dob || "-")],
              [text(t, "gender", "Gender"), String(details.gender || "-")],
              [text(t, "state", "State"), String(details.state || "-")],
              ["Father/Husband Name", String(details.fatherOrHusbandName || "-")],
              ["RTO", String(details.rtoName || "-")],
              ["Issue Date", String(details.doi || "-")],
              ["Expiry Date", String(details.doe || "-")],
              ["Initial Issue Date", String(details.initialDoi || "-")],
              ["Transport Issue Date", String(details.transportDoi || "-")],
              ["Transport Expiry Date", String(details.transportDoe || "-")],
              ["Blood Group", String(details.bloodGroup || "-")],
              ["Vehicle Classes", Array.isArray(details.vehicleClasses) ? details.vehicleClasses.join(", ") || "-" : String(details.vehicleClasses || "-")],
              ["Vehicle Class Description", Array.isArray(details.vehicleClassDescription) ? details.vehicleClassDescription.join(", ") || "-" : String(details.vehicleClassDescription || "-")],
              ["Permanent Address", String(details.permanentAddress || "-")],
              ["Permanent ZIP", String(details.permanentZip || "-")],
              ["Temporary Address", String(details.temporaryAddress || "-")],
              ["Temporary ZIP", String(details.temporaryZip || "-")],
              [text(t, "message", "Message"), String(details.statusDetail || details.status || result.riskBand || "-")]
            ]
        : service === "rc-basic"
          ? [
              [t.status, verificationStatusLabel(result.status, t)],
              [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
              ["Registration Number", String(details.registrationNumber || result.identifierMasked || "-")],
              ["Owner Name", String(rcOwner.name || result.customerName || "-")],
              ["Father Name", String(rcOwner.father_name || "-")],
              ["Ownership Type", String(rcOwner.ownership_type || "-")],
              ["Owner Count", String(rcOwner.owner_count || "-")],
              ["Present Address", String(rcOwner.present_address || "-")],
              ["Permanent Address", String(rcOwner.permanent_address || "-")],
              ["RC Status", String(rcOwner.status || "-")],
              ["Vehicle Class", String(rcVehicle.class || "-")],
              ["Category", String(rcVehicle.category_description || rcVehicle.category || "-")],
              ["Maker", String(rcVehicle.maker || "-")],
              ["Model", String(rcVehicle.model || "-")],
              ["Fuel Type", String(rcVehicle.fuel_type || "-")],
              ["Color", String(rcVehicle.color || "-")],
              ["Chassis Number", String(rcVehicle.masked_chassis_number || "-")],
              ["Engine Number", String(rcVehicle.masked_engine_number || "-")],
              ["Manufactured Date", String(rcVehicle.manufactured_date || "-")],
              ["Registration Date", String(rcRegistration.registration_date || rcVehicle.registration_date || "-")],
              ["Registration Valid Upto", String(rcRegistration.registration_upto || "-")],
              ["Registered At", String(rcRegistration.registered_at || "-")],
              ["Purchase Date", String(rcRegistration.purchase_date || "-")],
              ["Fitness Upto", String(rcVehicle.fitness_upto || "-")],
              ["Insurance Company", String(rcInsurance.insurer || "-")],
              ["Policy Number", String(rcInsurance.policy_number || "-")],
              ["Policy Expiry", String(rcInsurance.policy_expiry_date || "-")],
              ["Financer", String(rcFinance.financer || "-")],
              ["PUCC Number", String(rcPucc.pucc_number || "-")],
              ["PUCC Upto", String(rcPucc.pucc_upto || "-")],
              ["Blacklist Status", String(rcStatusDetails.blacklist_status || "-")],
              [text(t, "message", "Message"), String(details.status || result.riskBand || "-")]
            ]
        : isReportService
          ? reportRows
          : service === "pan"
            ? ([
                [t.status, verificationStatusLabel(result.status, t)],
                [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
                [text(t, "fullName", "Full Name"), panValue(["name", "full_name", "fullName", "pan_name"]) || String(details.fullName || result.customerName || "-")],
                [t.panNumber, String(details.panNumber || result.identifierMasked || "-")],
                panRecordValue(["status", "pan_status", "panStatus"]) ? ["PAN Status", panRecordValue(["status", "pan_status", "panStatus"])] : null,
                panRecordBooleanValue(["name_validated", "nameValidated"]) ? ["Name Validated", panRecordBooleanValue(["name_validated", "nameValidated"])] : null,
                panRecordBooleanValue(["name_match", "nameMatch"]) ? ["Name Match", panRecordBooleanValue(["name_match", "nameMatch"])] : null,
                panRecordValue(["name_match_score", "nameMatchScore"]) ? ["Name Match Score", panRecordValue(["name_match_score", "nameMatchScore"])] : null,
                (panValue(["date_of_birth", "dateOfBirth", "dob"]) || String(details.dob || "")) ? [t.dateOfBirth, panValue(["date_of_birth", "dateOfBirth", "dob"]) || String(details.dob)] : null,
                (panValue(["category", "pan_category", "panCategory"]) || String(details.category || "")) ? [text(t, "category", "Category"), panValue(["category", "pan_category", "panCategory"]) || String(details.category)] : null,
                panValue(["gender"]) ? [text(t, "gender", "Gender"), panValue(["gender"])] : null,
                panValue(["masked_aadhaar_number", "maskedAadhaarNumber"]) ? [text(t, "maskedAadhaar", "Masked Aadhaar"), panValue(["masked_aadhaar_number", "maskedAadhaarNumber"])] : null,
                panValue(["phone", "mobile", "mobile_number"]) ? [t.mobileNumber, panValue(["phone", "mobile", "mobile_number"])] : null,
                panValue(["email"]) ? [t.email, panValue(["email"])] : null,
                [panValue(["line_1", "address_line_1", "addressLine1"]), panValue(["street"]), panValue(["line_5"])].filter(Boolean).join(", ") ? [text(t, "address", "Address"), [panValue(["line_1", "address_line_1", "addressLine1"]), panValue(["street"]), panValue(["line_5"])].filter(Boolean).join(", ")] : null,
                panValue(["city"]) ? [text(t, "city", "City"), panValue(["city"])] : null,
                panValue(["state"]) ? [text(t, "state", "State"), panValue(["state"])] : null,
                panValue(["pincode", "pin_code", "pinCode"]) ? [text(t, "pincode", "Pincode"), panValue(["pincode", "pin_code", "pinCode"])] : null
              ].filter((row): row is [string, string] => Boolean(row)))
            : service === "uan-fetch-by-pan"
              ? [
                  [t.status, verificationStatusLabel(result.status, t)],
                  [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
                  [t.panNumber, String(details.panNumber || result.identifierMasked || "-")],
                  ["UAN List", listValue(["uan_list", "uanList"]).join(", ") || String(details.uan || "-")],
                  [text(t, "message", "Message"), panValue(["message", "remarks", "reason"]) || String(details.status || result.riskBand || "-")]
                ]
              : service === "uan-profile-details"
                ? [
                    [t.status, verificationStatusLabel(result.status, t)],
                    [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
                    ["UAN Number", panValue(["uan", "uan_number", "uanNumber"]) || String(details.uan || result.identifierMasked || "-")],
                    [text(t, "fullName", "Full Name"), panValue(["name", "full_name", "fullName", "member_name", "memberName"]) || String(details.fullName || result.customerName || "-")],
                    [text(t, "dateOfBirth", "Date of Birth"), panValue(["date_of_birth", "dateOfBirth", "dob"]) || String(details.dob || "-")],
                    [text(t, "gender", "Gender"), panValue(["gender"]) || String(details.gender || "-")],
                    [text(t, "guardianName", "Guardian Name"), panValue(["guardian_name", "guardianName"]) || "-"],
                    [text(t, "guardianRelation", "Guardian Relation"), panValue(["guardian_relation", "guardianRelation"]) || "-"],
                    [text(t, "bankAccountNumber", "Bank Account Number"), panValue(["bank_account_number", "bankAccountNumber"]) || "-"],
                    ["IFSC", panValue(["ifsc"]) || "-"],
                    [text(t, "mobileNumber", "Mobile Number"), panValue(["mobile_number", "mobileNumber", "mobile", "phone"]) || String(details.mobile || "-")],
                    [text(t, "message", "Message"), panValue(["message", "remarks", "reason"]) || String(details.status || result.riskBand || "-")]
                  ]
                : service === "employment-history"
                  ? [
                      [t.status, verificationStatusLabel(result.status, t)],
                      [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
                      ["UAN Number", String(details.uan || result.identifierMasked || "-")],
                      [text(t, "fullName", "Full Name"), panValue(["name", "full_name", "fullName", "member_name", "memberName"]) || String(details.fullName || result.customerName || "-")],
                      [text(t, "totalRecords", "Total Records"), String(employmentRecords.length || "-")],
                      [text(t, "message", "Message"), panValue(["message", "remarks", "reason"]) || String(details.status || result.riskBand || "-")]
                    ]
            : [
                [t.status, verificationStatusLabel(result.status, t)],
                [text(t, "clientId", "Client ID"), String(details.clientId || result.providerReference || "-")],
                [t.panNumber, String(details.panNumber || result.identifierMasked || "-")],
                ["UAN Number", String(details.uan || "-")],
                [t.mobileNumber, String(details.mobile || "-")],
                [text(t, "fullName", "Full Name"), panValue(["name", "full_name", "fullName", "member_name", "memberName", "employee_name", "employeeName"]) || String(details.fullName || result.customerName || "-")],
                ["UAN", panValue(["uan", "uan_number", "uanNumber", "uan_numbers", "uanNumbers"]) || String(details.uan || "-")],
                [text(t, "dateOfBirth", "Date of Birth"), panValue(["date_of_birth", "dateOfBirth", "dob"]) || String(details.dob || "-")],
                [text(t, "gender", "Gender"), panValue(["gender"]) || "-"],
                [text(t, "mobileNumber", "Mobile Number"), panValue(["phone", "mobile", "mobile_number", "mobileNumber"]) || String(details.mobile || "-")],
                [text(t, "company", "Company"), panValue(["company", "company_name", "companyName", "establishment_name", "establishmentName", "establishment"]) || "-"],
                [text(t, "memberId", "Member ID"), panValue(["member_id", "memberId", "memberIdNumber"]) || "-"],
                [text(t, "dateOfJoining", "Date of Joining"), panValue(["date_of_joining", "dateOfJoining", "doj"]) || "-"],
                [text(t, "dateOfExit", "Date of Exit"), panValue(["date_of_exit", "dateOfExit", "doe"]) || "-"],
                [text(t, "balance", "Balance"), panValue(["balance", "total_balance", "totalBalance", "pf_balance", "pfBalance"]) || "-"],
                [text(t, "message", "Message"), panValue(["message", "remarks", "reason"]) || String(details.status || result.riskBand || "-")]
              ];

  return (
    <article className="kyc-info-card">
      <h3>
        {service === "aadhaar"
          ? text(t, "aadhaarDetails", "Aadhaar Details")
          : service === "aadhaar-validation"
            ? text(t, "aadhaarValidation", "Aadhaar Validation")
          : service === "aadhaar-otp"
            ? text(t, "aadhaarOtp", "Aadhaar OTP")
          : service === "esign" || service === "econsent"
            ? service === "econsent"
              ? text(t, "eConsent", "e-Consent")
              : text(t, "esignDetails", "eSign Details")
            : isReportService
              ? text(t, serviceConfig[service].key, serviceConfig[service].key)
              : service === "pan"
                ? text(t, "panDetails", "PAN Details")
                : text(t, serviceConfig[service].key, serviceConfig[service].key)}
      </h3>
      <dl className="profile-list">
        {detailRows.map(([label, value], index) => (
          <div key={`${label}-${index}`}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {service === "employment-history" && employmentRecords.length > 0 && (
        <div className="table-wrap modal-detail-table">
          <table>
            <thead>
              <tr>
                <th>{text(t, "company", "Company")}</th>
                <th>{text(t, "memberId", "Member ID")}</th>
                <th>{text(t, "dateOfJoining", "Date of Joining")}</th>
                <th>{text(t, "dateOfExit", "Date of Exit")}</th>
              </tr>
            </thead>
            <tbody>
              {employmentRecords.map((record, index) => (
                <tr key={`${recordValue(record, ["member_id", "memberId"])}-${index}`}>
                  <td data-label={text(t, "company", "Company")}>{recordValue(record, ["establishment_name", "establishmentName", "company", "company_name", "companyName"])}</td>
                  <td data-label={text(t, "memberId", "Member ID")}>{recordValue(record, ["member_id", "memberId", "memberIdNumber"])}</td>
                  <td data-label={text(t, "dateOfJoining", "Date of Joining")}>{recordValue(record, ["date_of_joining", "dateOfJoining", "doj"])}</td>
                  <td data-label={text(t, "dateOfExit", "Date of Exit")}>{recordValue(record, ["date_of_exit", "dateOfExit", "doe"])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isReportService && !isJsonReport && <ReportActions result={result} t={t} />}
      {(service === "esign" || service === "econsent") && (
        <div className="modal-action-row">
          <EsignDownloadButton source={result} t={t} />
          <EsignAuditTrailButton source={result} t={t} />
        </div>
      )}
      {isJsonReport && <JsonReportObject value={details} t={t} />}
    </article>
  );
}

function JsonReportObject({ value, t }: { value: Record<string, unknown>; t: Record<string, string> }) {
  return (
    <details className="json-report-object">
      <summary>
        <span>{text(t, "report", "Report")}</span>
        <strong>{text(t, "openJson", "Open JSON")}</strong>
      </summary>
      <pre>{JSON.stringify(value || {}, null, 2)}</pre>
    </details>
  );
}

function SettingsView({
  language,
  t,
  user,
  canRunVerification
}: {
  language: Language;
  t: Record<string, string>;
  user: UserAccount;
  canRunVerification: boolean;
}) {
  const permissions = useMemo(
    () => [
      { label: t.inviteTeamMember, enabled: inviteMatrix[user.role].length > 0 },
      { label: t.runNewVerification, enabled: canRunVerification }
    ],
    [canRunVerification, t.inviteTeamMember, t.runNewVerification, user]
  );

  return (
    <div className="view-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">- {t.settings}</p>
          <h1>{t.profile}</h1>
        </div>
      </section>

      <section className="split-grid">
        <article className="panel profile-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">- {t.profile}</p>
              <h2>{user.name}</h2>
            </div>
            <CircleUserRound size={26} />
          </div>
          <dl className="profile-list">
            <div>
              <dt>{t.email}</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>{t.role}</dt>
              <dd>{roleLabels[language][user.role]}</dd>
            </div>
            <div>
              <dt>{t.planStatus}</dt>
              <dd>{user.planStatus.replace("_", " ")}</dd>
            </div>
          </dl>
        </article>

      </section>

      <DataPanel title={t.permissions} eyebrow={roleLabels[language][user.role]}>
        <div className="permission-grid">
          {permissions.map((permission) => (
            <div className="permission-row" key={permission.label}>
              <span>{permission.label}</span>
              <Badge tone={permission.enabled ? "success" : "muted"}>{permission.enabled ? t.active : t.pending}</Badge>
            </div>
          ))}
        </div>
      </DataPanel>
    </div>
  );
}

function StatCard({
  language,
  label,
  value,
  caption,
  icon: Icon,
  tone,
  low = false
}: {
  language: Language;
  label: string;
  value: number | string;
  caption: string;
  icon: LucideIcon;
  tone: string;
  low?: boolean;
}) {
  const displayValue = typeof value === "number" ? value.toLocaleString(language === "hi" ? "hi-IN" : "en-IN") : value;

  return (
    <article className={`metric-card ${tone}${low ? " low-wallet" : ""}`}>
      <div className="metric-top">
        <p className="eyebrow">{label}</p>
        <span className="metric-icon">
          <Icon size={23} />
        </span>
      </div>
      <strong>{displayValue}</strong>
      <div className="metric-bottom">
        <span>{caption}</span>
      </div>
      {low && <div className="low-wallet-popover">Wallet balance is very low</div>}
    </article>
  );
}

function FullPageLoader({ t }: { t: Record<string, string> }) {
  return (
    <main className="login-page">
      <section className="login-panel">
        <Logo t={t} compact={false} />
        <div className="loader-panel">
          <span className="loader-ring" />
          <strong>{t.loading}</strong>
        </div>
      </section>
    </main>
  );
}

function GlobalApiLoader() {
  return (
    <div className="global-api-loader" aria-hidden="true">
      <span />
    </div>
  );
}

function MetricSkeleton() {
  return (
    <article className="metric-card skeleton-card">
      <span className="skeleton-line short" />
      <span className="skeleton-line value" />
      <span className="skeleton-line medium" />
    </article>
  );
}

function ChartSkeleton() {
  return (
    <div className="trend-chart skeleton-chart">
      {Array.from({ length: 12 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="compact-row skeleton-row" key={index}>
          <div>
            <span className="skeleton-line medium" />
            <span className="skeleton-line short" />
          </div>
          <span className="skeleton-pill" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="table-skeleton">
      {Array.from({ length: rows }).map((_, row) => (
        <div className="table-skeleton-row" key={row}>
          {Array.from({ length: 5 }).map((__, col) => (
            <span className="skeleton-line" key={col} />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ rows, grid = false }: { rows: number; grid?: boolean }) {
  return (
    <div className={grid ? "plan-grid" : "plan-list"}>
      {Array.from({ length: rows }).map((_, index) => (
        <article className="plan-card skeleton-card" key={index}>
          <span className="skeleton-line short" />
          <span className="skeleton-line value" />
          <span className="skeleton-line medium" />
          <span className="skeleton-line short" />
        </article>
      ))}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="result-card skeleton-card">
      <span className="skeleton-line medium" />
      <span className="skeleton-line short" />
      <span className="skeleton-line medium" />
      <span className="skeleton-line short" />
    </div>
  );
}

function Modal({
  eyebrow,
  title,
  children,
  onClose
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-panel" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">- {eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function PasswordChecklist({ password, t }: { password: string; t: Record<string, string> }) {
  const checks = passwordChecks(password);
  return (
    <div className="password-checklist">
      {(Object.keys(checks) as Array<keyof typeof checks>).map((key) => (
        <span className={checks[key] ? "met" : ""} key={key}>
          <CheckCircle2 size={14} />
          {t[key]}
        </span>
      ))}
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
  required = false,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
      />
      <button type="button" onClick={() => setVisible((open) => !open)} aria-label={visible ? "Hide Password" : "Show Password"}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function ApiDocsView({
  t,
  user,
  onUpdated
}: {
  t: Record<string, string>;
  user: UserAccount;
  onUpdated: (user: UserAccount) => void;
}) {
  const [docsUser, setDocsUser] = useState(user);
  const visibleApiDocs = useMemo(
    () => publicApiDocs.filter((apiDoc) => userHasPermission(docsUser, apiPermissionByPublicApiId[apiDoc.id])),
    [docsUser]
  );
  const [selectedId, setSelectedId] = useState(publicApiDocs[0].id);
  const [codeLanguage, setCodeLanguage] = useState("curl");
  const [openApiDocGroups, setOpenApiDocGroups] = useState<Record<string, boolean>>({
    Bureau: false,
    Verification: false,
    Income: false,
    eSign: false
  });
  const [apiToken, setApiToken] = useState(docsUser.publicApiToken || "");
  const [tokenMessage, setTokenMessage] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const selected = visibleApiDocs.find((apiDoc) => apiDoc.id === selectedId) || visibleApiDocs[0];

  useEffect(() => {
    let mounted = true;
    api.me()
      .then((response) => {
        if (!mounted) return;
        setDocsUser(response.user);
        onUpdated(response.user);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selected && selected.id !== selectedId) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId]);

  useEffect(() => {
    setDocsUser(user);
  }, [user]);

  useEffect(() => {
    setApiToken(docsUser.publicApiToken || "");
  }, [docsUser.publicApiToken]);

  const visibleApiDocGroups = ["Bureau", "Verification", "Income", "eSign"]
    .map((category) => ({
      category,
      docs: visibleApiDocs.filter((apiDoc) => apiDoc.category === category)
    }))
    .filter((group) => group.docs.length > 0);

  async function regenerateToken() {
    setRegeneratingToken(true);
    setTokenMessage("");
    setTokenError("");
    try {
      const response = await api.regeneratePublicApiToken();
      setApiToken(response.user.publicApiToken || "");
      setDocsUser(response.user);
      onUpdated(response.user);
      setTokenMessage(text(t, "apiTokenRegenerated", "API token regenerated."));
    } catch (err) {
      setTokenError(getDisplayError(err, t.error));
    } finally {
      setRegeneratingToken(false);
    }
  }

  if (!selected) {
    return (
      <div className="view-stack">
        <section className="page-heading">
          <div>
            <p className="eyebrow">- PUBLIC API</p>
            <h1>{text(t, "apiDocs", "API Docs")}</h1>
          </div>
        </section>
        <div className="empty-state">{text(t, "noApiPermission", "No API permission is assigned to this account.")}</div>
      </div>
    );
  }

  const apiDocsBaseUrl = apiDocsBaseUrlForUser(docsUser);
  const url = `${apiDocsBaseUrl}${selected.path}`;
  const sampleResponse =
    selected.id === "mca-company-details"
      ? {
          timestamp: "2026-08-13T10:00:00.000Z",
          transaction_id: "36de97c5-2ea5-4696-9b3d-82551a5c57fb",
          status: "success",
          data: {
            client_id: "company_example123",
            company_id: "U12345MH2020PTC123456",
            company_type: "Company",
            company_name: "EXAMPLE SERVICES PRIVATE LIMITED",
            details: {
              company_info: {
                cin: "U12345MH2020PTC123456",
                roc_code: "RoC-Mumbai",
                company_category: "Company limited by Shares",
                class_of_company: "Private",
                date_of_incorporation: "2020-01-15",
                registered_address: "123 Example Road, Mumbai, Maharashtra 400001 IN",
                company_status: "Active"
              },
              directors: [{ din_number: "01234567", director_name: "EXAMPLE DIRECTOR", start_date: "2020-01-15" }],
              charges: []
            }
          }
        }
      : selected.id === "prefill"
        ? {
            timestamp: "2026-08-13T10:00:00.000Z",
            transaction_id: "TXN-example-1234",
            status: "success",
            data: {
              client_id: "TXN-example-1234",
              CIRReportData: {
                IDAndContactInfo: {
                  PersonalInfo: { Name: { FullName: "RAHUL KUMAR", FirstName: "RAHUL", LastName: "KUMAR" }, DateOfBirth: "01-01-1990", Age: { Age: "36" } },
                  IdentityInfo: { PANId: [{ seq: "1", ReportedDate: "31-07-2026", IdNumber: "ABCXX1234X" }] },
                  AddressInfo: [{ Seq: "1", ReportedDate: "31-07-2026", Address: "123 EXAMPLE ROAD", State: "MH", Postal: "400001" }],
                  PhoneInfo: [{ seq: "1", typeCode: "H", ReportedDate: "31-07-2026", Number: "919876XX3210" }],
                  EmailAddressInfo: [{ seq: "1", ReportedDate: "31-07-2026", EmailAddress: "RAHXX@EXAMPLE.COM" }]
                }
              }
            }
          }
        : selected.id === "pan-full-detail"
      ? {
          status: 200,
          message: "PAN Info",
          data: {
            pan_data: {
              document_type: "PAN",
              document_id: "ABCDE1234F",
              name: "TEST USER",
              first_name: "TEST",
              last_name: "USER",
              category: "P",
              date_of_birth: "1998-01-01",
              masked_aadhaar_number: "XXXXXXXX1234",
              address_data: {
                line_1: "123 Test Street",
                street: "Test Area",
                city: "INDORE",
                line_5: "Indore G.P.O.",
                state: "MADHYA PRADESH",
                pincode: "452001"
              },
              email: "te*****er@example.com",
              phone: "98XXXXXX10",
              gender: "MALE"
            }
          },
          request_uid: "VAPI-XXXXXXXXXXXX"
          }
        : selected.id === "aadhaar-validation"
          ? {
            statuscode: "TXN",
            status: true,
            message: "Aadhaar Verified Successfully",
            txnid: "TXNXXXXXXXXXXXX",
            data: {
              data: {
                status: "success_aadhaar",
                state: "Uttar Pradesh",
                age_range: "20-30",
                gender: "FEMALE",
                masked_mobile_number: "******6754",
                aadhaar_status_code: "1",
                aadhaar_number: "XXXXXXXX9012"
              },
              status_code: 200,
              message: null
            },
            request_id: 156676
          }
        : selected.id === "aadhaar-otp-generate"
          ? {
              statuscode: "TXN",
              status: true,
              message: "OTP sent successfully",
              request_id: "3987654"
            }
        : selected.id === "aadhaar-otp-verify"
          ? {
              statuscode: "TXN",
              message: "Aadhaar Verified Successfully",
              data: {
                full_name: "Test User",
                aadhaar_number: "XXXX-XXXX-9012",
                dob: "1998-01-01",
                gender: "M",
                zip: "110001",
                status: "success_aadhaar",
                address: {
                  care_of: "S/O: Test Guardian",
                  house: "123",
                  street: "Test Street",
                  loc: "Test Locality",
                  vtc: "Test VTC",
                  po: "Test Post Office",
                  subdist: "Test Sub District",
                  dist: "Test District",
                  state: "Delhi",
                  country: "India"
                }
              }
            }
        : selected.id === "gstin-verification"
          ? {
              statuscode: "TXN",
              message: "GST Verified Successfully",
              txnid: "TXNXXXXXXXXXXXX",
              data: {
                gstin: "27ABCDE1234F1Z5",
                pan_number: "ABCDE1234F",
                business_name: "EXAMPLE PRIVATE LIMITED",
                legal_name: "EXAMPLE PRIVATE LIMITED",
                gstin_status: "Active",
                taxpayer_type: "Regular",
                constitution_of_business: "Private Limited Company",
                date_of_registration: "2025-08-14",
                address: "123 Example Street, Mumbai, Maharashtra",
                nature_bus_activities: ["Supplier of Services"],
                filing_status: [],
                filing_frequency: [
                  { quarter: "Q1", preference: "M" },
                  { quarter: "Q2", preference: "M" }
                ]
              }
            }
        : selected.id === "bank-verification"
          ? {
              statuscode: "TXN",
              message: "Bank Verified Successfully",
              txnid: "TXNXXXXXXXXXXXX",
              data: {
                account_exists: true,
                upi_id: null,
                full_name: "TEST USER",
                remarks: "",
                ifsc_details: []
              }
            }
        : selected.id === "driving-license"
          ? {
              statuscode: "TXN",
              message: "Driving License Verified Successfully",
              txnid: "TXNXXXXXXXXXXXX",
              data: {
                license_number: "DLXXXXXXXXXXXX",
                state: "Delhi",
                name: "TEST USER",
                father_or_husband_name: "TEST GUARDIAN",
                dob: "1990-01-01",
                doi: "2017-01-18",
                doe: "2037-01-17",
                blood_group: "O+",
                vehicle_classes: ["MCWG", "LMV"],
                permanent_address: "123 Test Street, Delhi",
                permanent_zip: "110001"
              }
            }
        : selected.id === "rc-basic"
          ? {
              error: 0,
              msg: "RC Basic validation successfull",
              status: 1,
              orderid: "ORDER_XXXXXXXX",
              optransid: "RC_TXN_XXXXXXXX",
              cardData: {
                owner_details: {
                  name: "T*** U***",
                  present_address: "Test City, 110001",
                  permanent_address: "Test City, 110001",
                  owner_count: "1",
                  ownership_type: "INDIVIDUAL",
                  status: "ACTIVE"
                },
                vehicle_details: {
                  maker: "TEST MOTORS LTD",
                  model: "TEST MODEL",
                  masked_chassis_number: "MALXXXXXXXX*****",
                  masked_engine_number: "ENG*****",
                  fuel_type: "PETROL",
                  category_description: "LIGHT MOTOR VEHICLE",
                  class: "Motor Car",
                  color: "WHITE",
                  fitness_upto: "2031-02-27"
                },
                insurance_details: {
                  insurer: "TEST INSURANCE LTD",
                  policy_number: "POLICYXXXXXXXX",
                  policy_expiry_date: "2027-01-01"
                },
                registration_details: {
                  rc_number: "XX00XX0000",
                  registered_at: "KAMRUP, Assam",
                  registration_upto: "2031-02-27"
                }
              }
            }
        : selected.id === "aadhaar-esign"
          ? {
              success: true,
              status: "processing",
              message: "Processing",
              txn_id: "ESIGN_TXN_XXXXXXXX",
              contract_id: "CONTRACT_XXXXXXXX",
              lead_id: "FINREP_XXXXXXXX",
              workflow_url: "https://esign-dev.smartauth.co/api/python/v1/esign/redirect/...",
              expires_at: "2026-06-22 18:30:00"
            }
        : selected.id === "econsent"
          ? {
              documentId: "64f8d2a41d7c2c4b1f4a1234",
              transactionId: "ACONSENT-XXXX",
              status: "pending_aadhaar",
              signUrl: "https://service.algebrasoftech.com/sign/64f8d2a41d7c2c4b1f4a1234?token=SIGNING_TOKEN"
            }
        : selected.id === "econsent-status"
          ? {
              documentId: "64f8d2a41d7c2c4b1f4a1234",
              transactionId: "ESIGN-MQQA83KY-28DEBDD9",
              status: "signed",
              statusLabel: "Signed",
              signedDocumentAvailable: true,
              signer: {
                name: "Test User",
                email: "test@example.com",
                mobile: "9876543210",
                location: "India"
              }
            }
        : selected.id === "econsent-share"
          ? {
              documentId: "64f8d2a41d7c2c4b1f4a1234",
              transactionId: "ACONSENT-XXXX",
              status: "pending_aadhaar",
              signUrl: "https://service.algebrasoftech.com/sign/64f8d2a41d7c2c4b1f4a1234?token=SIGNING_TOKEN",
              shareUrl: "https://service.algebrasoftech.com/sign/64f8d2a41d7c2c4b1f4a1234?token=SHARE_SIGNING_TOKEN",
              message: "Share this URL with the signer to complete Aadhaar e-Consent."
            }
        : selected.id === "econsent-signed-document"
          ? {
              contentType: "application/pdf",
              fileName: "econsent-signed-document.pdf",
              body: "<binary PDF stream>"
            }
        : selected.id === "econsent-audit-trail"
          ? {
              contentType: "application/pdf",
              fileName: "econsent-audit-trail.pdf",
              body: "<binary PDF stream>"
            }
        : selected.id === "uan-fetch-by-pan"
        ? {
            status: 200,
            message: "UAN fetched from pan.",
            data: {
              uan_list: ["100000000000"]
            },
            error: "",
            request: {
              pan_number: "ABCDE1234F",
              consent: "Y"
            },
            request_uid: "VAPI-XXXXXXXXXXXX"
          }
        : selected.id === "uan-profile-details"
          ? {
              status: 200,
              message: "Profile details fetched.",
              data: {
                uan_profile_data: {
                  uan: "100000000000",
                  name: "TEST USER",
                  dob: "01-01-1998",
                  gender: "M",
                  guardian_name: "TEST GUARDIAN",
                  guardian_relation: "F",
                  bank_account_number: "123456789012",
                  ifsc: "ABCD0123456",
                  mobile_number: "9876543210"
                }
              },
              error: "",
              request: {
                uan: "100000000000",
                consent: "Y"
              },
              request_uid: "VAPI-XXXXXXXXXXXX"
            }
          : selected.id === "employment-history"
            ? {
                status: 200,
                message: "Employment history fetched.",
                data: {
                  employment_data: [
                    {
                      name: "TEST USER",
                      establishment_name: "ABC SERVICES PRIVATE LIMITED",
                      member_id: "MPIND00000000000000001",
                      date_of_joining: "2024-01-01",
                      date_of_exit: "2025-01-01"
                    },
                    {
                      name: "TEST USER",
                      establishment_name: "XYZ SOLUTIONS PRIVATE LIMITED",
                      member_id: "MPIND00000000000000002",
                      date_of_joining: "2023-01-01"
                    }
                  ]
                },
                error: "",
                request: {
                  uan_number: "100000000000",
                  consent: "Y"
                },
                request_uid: "VAPI-XXXXXXXXXXXX"
              }
            : selected.id === "experian-json"
              ? {
                  status: true,
                  response_code: 200,
                  result_code: 101,
                  message: "Request Successful",
                  reference_number: "EXP-TEST-0001",
                  data: {
                    bureau: "Experian",
                    report_status: "generated",
                    credit_score: 750,
                    report: {}
                  }
                }
            : selected.id === "experian-pdf"
              ? {
                  status: true,
                  response_code: 200,
                  result_code: 101,
                  message: "Request Successful",
                  reference_number: "EXP-TEST-0001",
                  content_type: "application/pdf",
                  file_name: "experian-credit-report.pdf"
                }
            : selected.id === "face-match"
              ? {
                  status: true,
                  response_code: 200,
                  result_code: 101,
                  message: "Face matched successfully",
                  reference_number: "FACE-TEST-0001",
                  data: {
                    match: true,
                    match_score: 96.42
                  }
                }
            : selected.id === "crif-pdf"
              ? {
                  status: true,
                  response_code: 200,
                  result_code: 101,
                  message: "Request Successful",
                  reference_number: "CRIF-TEST-0001",
                  content_type: "application/pdf",
                  file_name: "crif-credit-report.pdf",
                  file: "BASE64_PDF_DATA"
                }
            : selected.id === "crif-json"
              ? {
                  status: true,
                  response_code: 200,
                  result_code: 101,
                  message: "Request Successful",
                  reference_number: "CRIF-TEST-0001",
                  data: {
                    report_status: "generated",
                    report: {}
                  }
                }
            : selected.response === "application/pdf"
              ? {
                  success: true,
                  message: "Report generated",
                  contentType: "application/pdf",
                  fileName: `${selected.id}-report.pdf`,
                  file: "BASE64_PDF_DATA",
                  request_uid: "VAPI-XXXXXXXXXXXX"
                }
              : { success: true, message: "Report generated", data: {}, request_uid: "VAPI-XXXXXXXXXXXX" };
  const hasRequestBody = selected.method !== "GET" && Object.keys(selected.sample).length > 0;
  const codeSample = publicApiCodeSample({ url, payload: selected.sample, language: codeLanguage, method: selected.method, multipart: selected.id === "face-match" });

  return (
    <div className="view-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">- PUBLIC API</p>
          <h1>{text(t, "apiDocs", "API Docs")}</h1>
        </div>
      </section>

      <section className="api-docs-shell">
        <aside className="api-docs-list panel">
          {visibleApiDocGroups.map((group) => (
            <div className="api-docs-list-group" key={group.category}>
              <button
                className={`api-docs-group-toggle ${group.category.toLowerCase()}`}
                type="button"
                onClick={() => setOpenApiDocGroups((current) => ({ ...current, [group.category]: current[group.category] === false }))}
                aria-expanded={openApiDocGroups[group.category] !== false}
              >
                <span>{group.category}</span>
                <small>{group.docs.length} APIs</small>
                <ChevronDown className={openApiDocGroups[group.category] !== false ? "open" : ""} size={15} />
              </button>
              {openApiDocGroups[group.category] !== false && group.docs.map((apiDoc) => (
                  <button
                    className={apiDoc.id === selected.id ? "active" : ""}
                    type="button"
                    key={apiDoc.id}
                    onClick={() => setSelectedId(apiDoc.id)}
                  >
                    <span>{apiDoc.name}</span>
                  </button>
                ))}
            </div>
          ))}
        </aside>

        <article className="api-docs-detail">
          <section className="api-guide-card">
            <header>
              <div>
                <span>&lt;/&gt;</span>
                <strong>API Guide</strong>
              </div>
              <div className="api-language-pills" role="tablist" aria-label="Code format">
                {[
                  ["curl", "cURL"],
                  ["node", "Node"],
                  ["php", "PHP"],
                  ["python", "Python"]
                ].map(([value, label]) => (
                  <button className={codeLanguage === value ? "active" : ""} type="button" key={value} onClick={() => setCodeLanguage(value)}>
                    {label}
                  </button>
                ))}
              </div>
            </header>

            <div className="api-guide-section">
              <p>Endpoint</p>
              <pre><code><strong>{selected.method}</strong> {url}</code></pre>
            </div>

            <div className="api-guide-section">
              <p>Headers</p>
              <pre><code>{JSON.stringify({ "x-api-token": "YOUR_TOKEN", "Content-Type": "application/json" }, null, 2)}</code></pre>
            </div>

            {hasRequestBody && (
              <div className="api-guide-section">
                <p>Request Body</p>
                <pre><code>{JSON.stringify(selected.sample, null, 2)}</code></pre>
              </div>
            )}

            <div className="api-guide-section">
              <p>{codeLanguage === "curl" ? "cURL" : codeLanguage === "node" ? "Node.js" : codeLanguage === "php" ? "PHP" : "Python"}</p>
              <pre><code>{codeSample}</code></pre>
            </div>
          </section>

          <section className="sample-response-card">
            <header>
              <span>?</span>
              <strong>Sample Response</strong>
            </header>
            <pre><code>{JSON.stringify(sampleResponse, null, 2)}</code></pre>
          </section>

          {docsUser.role !== "super_admin" && (
            <section className="api-token-panel">
              <header>
                <div>
                  <strong>{text(t, "apiToken", "API Token")}</strong>
                  <span>{text(t, "apiTokenHint", "Use this token in the x-api-token header.")}</span>
                </div>
                <button className="secondary-button" type="button" onClick={regenerateToken} disabled={regeneratingToken}>
                  {regeneratingToken ? <span className="button-loader dark" /> : <Zap size={16} />}
                  {text(t, "regenerate", "Regenerate")}
                </button>
              </header>
              <code>{apiToken || text(t, "noApiToken", "No token generated yet. Click Regenerate.")}</code>
              {tokenMessage && <p className="form-success">{tokenMessage}</p>}
              {tokenError && <p className="form-error">{tokenError}</p>}
            </section>
          )}
        </article>
      </section>
    </div>
  );
}

function publicApiCodeSample({ url, payload, language, method = "POST", multipart = false }: { url: string; payload: Record<string, unknown>; language: string; method?: string; multipart?: boolean }) {
  const body = JSON.stringify(payload, null, 2);
  const upperMethod = String(method || "POST").toUpperCase();
  const isGet = upperMethod === "GET";
  if (multipart) {
    if (language === "node") return [
      'import fs from "node:fs";',
      '',
      'const form = new FormData();',
      'form.append("name", "Test User");',
      'form.append("selfie_file", new Blob([fs.readFileSync("./selfie.jpg")], { type: "image/jpeg" }), "selfie.jpg");',
      'form.append("card_image", new Blob([fs.readFileSync("./identity-card.jpg")], { type: "image/jpeg" }), "identity-card.jpg");',
      '',
      `const response = await fetch("${url}", { method: "POST", headers: { "x-api-token": "CUSTOMER_TOKEN" }, body: form });`,
      'console.log(await response.json());'
    ].join("\n");
    if (language === "php") return [
      '<?php',
      `$ch = curl_init("${url}");`,
      '$payload = [',
      '  "name" => "Test User",',
      '  "selfie_file" => new CURLFile("./selfie.jpg", "image/jpeg", "selfie.jpg"),',
      '  "card_image" => new CURLFile("./identity-card.jpg", "image/jpeg", "identity-card.jpg")',
      '];',
      'curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_HTTPHEADER => ["x-api-token: CUSTOMER_TOKEN"], CURLOPT_POSTFIELDS => $payload]);',
      'echo curl_exec($ch);',
      'curl_close($ch);'
    ].join("\n");
    if (language === "python") return [
      'import requests',
      '',
      `url = "${url}"`,
      'headers = {"x-api-token": "CUSTOMER_TOKEN"}',
      'data = {"name": "Test User"}',
      'files = {"selfie_file": ("selfie.jpg", open("./selfie.jpg", "rb"), "image/jpeg"), "card_image": ("identity-card.jpg", open("./identity-card.jpg", "rb"), "image/jpeg")}',
      'response = requests.post(url, headers=headers, data=data, files=files)',
      'print(response.text)'
    ].join("\n");
    return [
      `curl --location '${url}' \\`,
      "  --header 'x-api-token: CUSTOMER_TOKEN' \\",
      "  --form 'name=Test User' \\",
      "  --form 'selfie_file=@\"./selfie.jpg\"' \\",
      "  --form 'card_image=@\"./identity-card.jpg\"'"
    ].join("\n");
  }
  if (language === "node") {
    const lines = [
      "const response = await fetch(\"" + url + "\", {",
      "  method: \"" + upperMethod + "\",",
      "  headers: {",
      "    \"x-api-token\": \"CUSTOMER_TOKEN\"" + (isGet ? "" : ","),
      ...(isGet ? [] : ["    \"Content-Type\": \"application/json\""]),
      "  }" + (isGet ? "" : ","),
      ...(isGet ? [] : ["  body: JSON.stringify(" + body.replace(/\n/g, "\n  ") + ")"]),
      "});",
      "",
      "const result = await response.json();",
      "console.log(result);"
    ];
    return lines.join("\n");
  }
  if (language === "php") {
    return isGet ? [
      "<?php",
      "$ch = curl_init(\"" + url + "\");",
      "curl_setopt_array($ch, [",
      "  CURLOPT_RETURNTRANSFER => true,",
      "  CURLOPT_HTTPHEADER => [",
      "    \"x-api-token: CUSTOMER_TOKEN\"",
      "  ],",
      "]);",
      "$response = curl_exec($ch);",
      "curl_close($ch);",
      "echo $response;"
    ].join("\n") : [
      "<?php",
      "$payload = " + phpArray(payload) + ";",
      "$ch = curl_init(\"" + url + "\");",
      "curl_setopt_array($ch, [",
      "  CURLOPT_RETURNTRANSFER => true,",
      "  CURLOPT_POST => true,",
      "  CURLOPT_HTTPHEADER => [",
      "    \"x-api-token: CUSTOMER_TOKEN\",",
      "    \"Content-Type: application/json\"",
      "  ],",
      "  CURLOPT_POSTFIELDS => json_encode($payload),",
      "]);",
      "$response = curl_exec($ch);",
      "curl_close($ch);",
      "echo $response;"
    ].join("\n");
  }
  if (language === "python") {
    return isGet ? [
      "import requests",
      "",
      "url = \"" + url + "\"",
      "headers = {",
      "    \"x-api-token\": \"CUSTOMER_TOKEN\"",
      "}",
      "",
      "response = requests.get(url, headers=headers)",
      "print(response.text)"
    ].join("\n") : [
      "import requests",
      "",
      "url = \"" + url + "\"",
      "headers = {",
      "    \"x-api-token\": \"CUSTOMER_TOKEN\",",
      "    \"Content-Type\": \"application/json\"",
      "}",
      "payload = " + pythonDict(payload),
      "",
      "response = requests.post(url, headers=headers, json=payload)",
      "print(response.text)"
    ].join("\n");
  }
  return isGet
    ? [
        "curl --location '" + url + "' \\",
        "  --header 'x-api-token: CUSTOMER_TOKEN'"
      ].join("\n")
    : [
        "curl --location '" + url + "' \\",
        "  --header 'x-api-token: CUSTOMER_TOKEN' \\",
        "  --header 'Content-Type: application/json' \\",
        "  --data '" + body + "'"
      ].join("\n");
}

function phpArray(payload: Record<string, unknown>) {
  const entries = Object.entries(payload).map(([key, value]) => `  \"${key}\" => \"${String(value)}\"`);
  return "[\n" + entries.join(",\n") + "\n]";
}

function pythonDict(payload: Record<string, unknown>) {
  const entries = Object.entries(payload).map(([key, value]) => `    \"${key}\": \"${String(value)}\"`);
  return "{\n" + entries.join(",\n") + "\n}";
}

function ProfileView({
  language,
  t,
  user,
  onUpdated
}: {
  language: Language;
  t: Record<string, string>;
  user: UserAccount;
  onUpdated: (user: UserAccount) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  const [contact, setContact] = useState(user.contact || "");
  const [roadStreet, setRoadStreet] = useState(user.roadStreet || "");
  const [stateCode, setStateCode] = useState(user.stateCode || "");
  const [pincode, setPincode] = useState(user.pincode || "");
  const [gstin, setGstin] = useState(user.gstin || "");
  const [pan, setPan] = useState(user.pan || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canChangePassword = user.role === "super_admin";

  function handleProfileImage(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(String(reader.result || ""));
      setIsEditing(true);
    };
    reader.readAsDataURL(file);
  }

  function cancelEdit() {
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setAvatarUrl(user.avatarUrl || "");
    setContact(user.contact || "");
    setRoadStreet(user.roadStreet || "");
    setStateCode(user.stateCode || "");
    setPincode(user.pincode || "");
    setGstin(user.gstin || "");
    setPan(user.pan || "");
    setError("");
    setIsEditing(false);
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    if (canChangePassword && password && !isStrongPasswordValue(password)) {
      setError(t.passwordMinimum);
      setSaving(false);
      return;
    }

    try {
      const response = await api.updateProfile({
        name,
        email,
        password: canChangePassword ? password || undefined : undefined,
        avatarUrl,
        contact,
        roadStreet,
        stateCode,
        pincode,
        gstin,
        pan
      });
      onUpdated(response.user);
      setIsEditing(false);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">- {roleLabels[language][user.role]}</p>
          <h1>{t.profile}</h1>
        </div>
      </section>

      <article className="panel profile-page-panel">
        <form className="profile-form" onSubmit={submitProfile}>
        <div className="profile-photo-wrap">
          <label className="profile-photo" title={t.changeProfilePhoto}>
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials(user.name)}</span>}
            <input type="file" accept="image/*" onChange={(event) => handleProfileImage(event.target.files?.[0])} />
            <em>
              <Camera size={18} />
            </em>
          </label>
        </div>

        {!isEditing ? (
          <>
            <dl className="profile-list">
              <div>
                <dt>{t.name}</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>{t.email}</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>{t.role}</dt>
                <dd>{roleLabels[language][user.role]}</dd>
              </div>
              <div>
                <dt>{t.planStatus}</dt>
                <dd>{user.planStatus.replace("_", " ")}</dd>
              </div>
              <div>
                <dt>{text(t, "contact", "Contact")}</dt>
                <dd>{user.contact || "-"}</dd>
              </div>
              <div>
                <dt>{text(t, "roadStreet", "Road / Street")}</dt>
                <dd>{user.roadStreet || "-"}</dd>
              </div>
              <div>
                <dt>{text(t, "state", "State")}</dt>
                <dd>{user.stateCode || "-"}</dd>
              </div>
              <div>
                <dt>{text(t, "pincode", "Pincode")}</dt>
                <dd>{user.pincode || "-"}</dd>
              </div>
              <div>
                <dt>GSTIN</dt>
                <dd>{user.gstin || "-"}</dd>
              </div>
              <div>
                <dt>{t.panNumber}</dt>
                <dd>{user.pan || "-"}</dd>
              </div>
            </dl>
            <button className="primary-button" type="button" onClick={() => setIsEditing(true)}>
              <Pencil size={18} />
              {t.editProfile}
            </button>
          </>
        ) : (
          <div className="form-grid">
            <label>
              <span>{t.name}</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label>
              <span>{t.email}</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </label>
            <label>
              <span>{text(t, "contact", "Contact")}</span>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                inputMode="tel"
                maxLength={20}
                placeholder="+91 99999 99999"
              />
            </label>
            <label className="span-2">
              <span>{text(t, "roadStreet", "Road / Street")}</span>
              <input value={roadStreet} onChange={(event) => setRoadStreet(event.target.value)} />
            </label>
            <label>
              <span>{text(t, "state", "State")}</span>
              <select value={stateCode} onChange={(event) => setStateCode(event.target.value)}>
                <option value="">Select State</option>
                {indianStateOptions.map((state) => (
                  <option key={state.code} value={state.code}>{state.code} - {state.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{text(t, "pincode", "Pincode")}</span>
              <input
                value={pincode}
                onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
              />
            </label>
            <label>
              <span>GSTIN</span>
              <input value={gstin} onChange={(event) => setGstin(event.target.value.toUpperCase().slice(0, 15))} maxLength={15} />
            </label>
            <label>
              <span>{t.panNumber}</span>
              <input value={pan} onChange={(event) => setPan(event.target.value.toUpperCase().slice(0, 10))} maxLength={10} />
            </label>
            {canChangePassword && (
              <label>
                <span>{t.password}</span>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  placeholder="Leave Blank to Keep Current Password"
                  autoComplete="new-password"
                />
                {password && <PasswordChecklist password={password} t={t} />}
              </label>
            )}
            {error && <p className="form-error">{error}</p>}
            <div className="profile-edit-actions">
              <button className="secondary-button" type="button" onClick={cancelEdit} disabled={saving}>
                <X size={18} />
                {t.cancel}
              </button>
              <button className="primary-button" type="submit" disabled={saving}>
                <Save size={18} />
                {saving ? t.loading : t.updateProfile}
              </button>
            </div>
          </div>
        )}
        </form>
      </article>
      {user.role === "super_admin" && <BillingSettingsPanel t={t} editable={isEditing} />}
    </div>
  );
}

function ToastMessage({
  message,
  tone,
  onDone
}: {
  message: string;
  tone: "success" | "error";
  onDone: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDone, 10000);
    return () => window.clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className={`app-toast ${tone}`} role="status">
      <span>{tone === "success" ? <CheckCircle2 size={18} /> : <X size={18} />}</span>
      <strong>{message}</strong>
    </div>
  );
}

function BillingSettingsPanel({ t, editable = true }: { t: Record<string, string>; editable?: boolean }) {
  const [billingSettings, setBillingSettings] = useState<BillingSettings>(defaultBillingSettings);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");
  const [billingError, setBillingError] = useState("");

  useEffect(() => {
    let mounted = true;
    setBillingLoading(true);
    api.billingSettings()
      .then((settings) => {
        if (mounted) setBillingSettings({ ...defaultBillingSettings, ...settings });
      })
      .catch((err) => {
        if (mounted) setBillingError(getDisplayError(err, t.error));
      })
      .finally(() => {
        if (mounted) setBillingLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [t.error]);

  function updateBillingField(field: keyof BillingSettings, value: string) {
    setBillingSettings((current) => ({
      ...current,
      [field]: value,
      ...(field === "supplierStateCode" ? { supplierState: indianStateOptions.find((state) => state.code === value)?.name || "" } : {})
    }));
  }

  async function submitBillingSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBillingSaving(true);
    setBillingMessage("");
    setBillingError("");
    try {
      const saved = await api.updateBillingSettings(billingSettings);
      setBillingSettings({ ...defaultBillingSettings, ...saved });
      setBillingMessage("Billing settings saved");
    } catch (err) {
      setBillingError(getDisplayError(err, t.error));
    } finally {
      setBillingSaving(false);
    }
  }

  return (
    <article className="panel profile-page-panel billing-settings-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">- Billing</p>
          <h2>Invoice Settings</h2>
        </div>
        <FileCheck2 size={25} />
      </div>
      {billingLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <form className="form-grid billing-settings-form" onSubmit={submitBillingSettings}>
          <label>
            <span>Firm Name</span>
            <input value={billingSettings.firmName} onChange={(event) => updateBillingField("firmName", event.target.value)} disabled={!editable || billingSaving} />
          </label>
          <label>
            <span>Supplier Email</span>
            <input value={billingSettings.supplierEmail} onChange={(event) => updateBillingField("supplierEmail", event.target.value)} disabled={!editable || billingSaving} type="email" />
          </label>
          <label>
            <span>Supplier Phone</span>
            <input value={billingSettings.supplierPhone} onChange={(event) => updateBillingField("supplierPhone", event.target.value)} disabled={!editable || billingSaving} inputMode="tel" maxLength={20} placeholder="+91 99999 99999" />
          </label>
          <label className="span-2">
            <span>Firm Address</span>
            <input value={billingSettings.firmAddress} onChange={(event) => updateBillingField("firmAddress", event.target.value)} disabled={!editable || billingSaving} />
          </label>
          <label>
            <span>Supplier Pincode</span>
            <input value={billingSettings.supplierPincode} onChange={(event) => updateBillingField("supplierPincode", event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={!editable || billingSaving} inputMode="numeric" maxLength={6} />
          </label>
          <label>
            <span>Supplier State</span>
            <select value={billingSettings.supplierStateCode} onChange={(event) => updateBillingField("supplierStateCode", event.target.value)} disabled={!editable || billingSaving}>
              <option value="">Select State</option>
              {indianStateOptions.map((state) => (
                <option key={state.code} value={state.code}>{state.code} - {state.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Supplier GSTIN</span>
            <input value={billingSettings.supplierGstin} onChange={(event) => updateBillingField("supplierGstin", event.target.value)} disabled={!editable || billingSaving} />
          </label>
          <label>
            <span>Supplier PAN</span>
            <input value={billingSettings.supplierPan} onChange={(event) => updateBillingField("supplierPan", event.target.value)} disabled={!editable || billingSaving} />
          </label>
          <label>
            <span>SAC Code</span>
            <input value={billingSettings.sacCode} onChange={(event) => updateBillingField("sacCode", event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={!editable || billingSaving} inputMode="numeric" maxLength={6} />
          </label>
          <ToastMessage
            message={billingMessage || billingError}
            tone={billingError ? "error" : "success"}
            onDone={() => {
              setBillingMessage("");
              setBillingError("");
            }}
          />
          <button className="primary-button" type="submit" disabled={!editable || billingSaving}>
            {billingSaving ? <span className="button-loader" /> : <Save size={18} />}
            {billingSaving ? t.loading : editable ? "Save Billing Settings" : "Click Edit Profile to Change Billing"}
          </button>
        </form>
      )}
    </article>
  );
}

function TrendChart({ values, labels }: { values: number[]; labels?: string[] }) {
  const safeValues = values.length > 0 ? values : Array.from({ length: 12 }, () => 0);
  const max = Math.max(...safeValues, 1);
  const safeLabels = labels?.length === safeValues.length ? labels : currentTrendLabels(safeValues.length);
  const points = safeValues.map((value, index) => {
    const x = safeValues.length === 1 ? 50 : (index / (safeValues.length - 1)) * 100;
    const y = 88 - (value / max) * 76;
    return { x, y, value };
  });
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L 100 92 L 0 92 Z`;

  return (
    <div className="trend-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="trend-area" d={areaPath} />
        <path className="trend-line" d={linePath} />
      </svg>
      <div className="trend-points">
        {points.map((point, index) => (
          <span
            aria-label={`${point.value} verifications`}
            data-label={`${safeLabels[index] || `M${index + 1}`}: ${point.value}`}
            key={`${point.value}-${index}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={`${point.value} verifications`}
          />
        ))}
      </div>
      <div className="trend-labels">
        {points.map((point, index) => (
          <small key={index} style={{ left: `${point.x}%` }}>
            {safeLabels[index] || index + 1}
          </small>
        ))}
      </div>
    </div>
  );
}

function BarTrendChart({ values, labels }: { values: number[]; labels?: string[] }) {
  const safeValues = values.length > 0 ? values : Array.from({ length: 12 }, () => 0);
  const max = Math.max(...safeValues, 1);
  const safeLabels = labels?.length === safeValues.length ? labels : currentTrendLabels(safeValues.length);

  return (
    <div className="bar-trend-chart">
      {safeValues.map((value, index) => (
        <span key={`${value}-${index}`}>
          <i style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
          <em className="bar-tooltip">
            <strong>{safeLabels[index] || index + 1}</strong>
            <small><b /> Successful: {value.toLocaleString("en-IN")}</small>
          </em>
          <small>{safeLabels[index] || index + 1}</small>
        </span>
      ))}
    </div>
  );
}

function currentTrendLabels(length = 12) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short" });
  const now = new Date();
  return Array.from({ length }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (length - 1 - index), 1);
    return formatter.format(date);
  });
}

function currentTrendPeriod() {
  return String(new Date().getFullYear());
}

function PlanCard({
  language,
  t,
  plan,
  action
}: {
  language: Language;
  t: Record<string, string>;
  plan: Plan;
  action?: ReactNode;
}) {
  const audienceLabel = plan.audienceUserName
    ? `${text(t, "craftedFor", "Crafted for")} ${plan.audienceUserName}`
    : plan.audienceUserId
      ? t.craftedOnlyForYou
      : roleLabels[language][plan.audienceRole];
  const serviceRates = plan.serviceRates?.length
    ? plan.serviceRates.filter((rate) => rate.service === "CIBIL")
    : [{ service: "CIBIL", cost: 0 }];
  const cibilRate = serviceRates[0]?.cost || 0;

  return (
    <article className="plan-card">
      <div>
        <p className="eyebrow">{audienceLabel}</p>
        <h3>{plan.name}</h3>
        {plan.audienceUserName && <span className="plan-recipient">{plan.audienceUserName} - {plan.audienceUserEmail}</span>}
      </div>
      <p className="plan-rate-summary">
        <span>CIBIL</span>
        <strong>{formatConnects(cibilRate)}</strong>
        <small>{t.perSuccessCost}</small>
      </p>
      {action}
    </article>
  );
}

function DataPanel({
  eyebrow,
  title,
  action,
  footer,
  children
}: {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const hasHeading = Boolean(eyebrow || title);
  const hasTop = hasHeading || action;

  return (
    <article className="panel data-panel">
      {hasTop && (
        <div className={hasHeading ? "panel-heading" : "panel-toolbar"}>
          {hasHeading && (
            <div>
              {eyebrow && <p className="eyebrow">- {eyebrow}</p>}
              {title && <h2>{title}</h2>}
            </div>
          )}
          {action}
        </div>
      )}
      {children}
      {footer && <div className="panel-footer">{footer}</div>}
    </article>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "muted" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function AppFooter({ t }: { t: Record<string, string> }) {
  return (
    <footer className="app-footer">
      <nav className="footer-links" aria-label="Legal links">
        <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">
          {text(t, "privacyPolicy", "Privacy Policy")}
        </a>
        <a href={TERMS_PRIVACY_URL} target="_blank" rel="noreferrer">
          {text(t, "termsConditions", "Terms & Conditions")}
        </a>
      </nav>
      <p>{text(t, "copyright", "Copyright 2026 Finrep. All rights reserved.")}</p>
      <strong>{text(t, "projectName", "Finrep")}</strong>
    </footer>
  );
}

function Logo({ t, compact }: { t: Record<string, string>; compact: boolean }) {
  return (
    <div className={compact ? "logo compact" : "logo"}>
      <img className="logo-image" src="/brand/finrep-logo.png" alt={t.appName} />
    </div>
  );
}

function firstName(name: string) {
  return name.split(" ")[0] || name;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusLabel(status: string, t: Record<string, string>) {
  if (status === "sent") return t.sent;
  if (status === "accepted") return t.accepted;
  if (status === "active") return t.active;
  if (status === "invited") return text(t, "notActive", "Not Active");
  if (status === "suspended") return text(t, "blocked", "Blocked");
  return status;
}

function kycStatusLabel(status: string, t: Record<string, string>) {
  if (status === "verified" || status === "not_required") return t.verifiedKyc;
  if (status === "pending_admin") return t.pending;
  if (status === "rejected") return text(t, "rejected", "Rejected");
  return t.unverifiedKyc;
}

function verificationStatusLabel(status: string, t: Record<string, string>) {
  if (status === "verified") return t.verified;
  if (status === "pending") return t.pending;
  return status;
}

function formatProviderStatus(value: unknown) {
  const status = String(value || "").trim();
  if (!status) return "-";
  if (status.toLowerCase() === "verified") return "Verified";
  return status;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartInputValue() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function formatToday(language: Language) {
  return new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date());
}

function formatShortDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date(value));
}

function formatCurrency(value: number, language: Language) {
  return new Intl.NumberFormat(language === "hi" ? "hi-IN" : "en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value);
}

function roundCurrency(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatConnects(value: number) {
  return `\u20B9${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)}`;
}

function isValidDdMmYyyy(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || "").trim());
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1900 &&
    year <= new Date().getUTCFullYear() &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export default App;








