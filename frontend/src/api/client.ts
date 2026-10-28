export type Role = "super_admin" | "agent" | "sub_agent" | "user";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  roadStreet?: string;
  pincode?: string;
  stateCode?: string;
  gstin?: string;
  pan?: string;
  contact?: string;
  role: Role;
  status: string;
  planStatus: string;
  kycStatus: string;
  kyc: {
    aadhaar: Record<string, unknown> & {
      status?: string;
      number?: string;
      maskedNumber?: string;
      lastDigits?: string;
      clientId?: string;
      ageRange?: string;
      state?: string;
      gender?: string;
      isMobile?: boolean;
      mobileLastDigits?: string;
      remarks?: string;
      verifiedAt?: string | null;
    };
    esign: Record<string, unknown> & {
      status?: string;
      phone?: string;
      providerReference?: string;
      requestedAt?: string | null;
      signedAt?: string | null;
    };
    pan: Record<string, unknown> & {
      status?: string;
      number?: string;
      maskedNumber?: string;
      clientId?: string;
      name?: string;
      dob?: string;
      category?: string;
      verifiedAt?: string | null;
    };
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    rejectionReason: string;
    rejectionIssues?: {
      aadhaar?: { selected: boolean; reason: string };
      pan?: { selected: boolean; reason: string };
      esign?: { selected: boolean; reason: string };
    };
  };
  walletKey: string;
  walletBalance: number;
  walletBalanceUnits: number;
  permissions: string[];
  publicApiToken?: string;
  whiteLabelApiDomain?: string;
  issuedPassword?: string;
  apiPricing?: ApiPricing;
  currentPlanId: string | null;
  avatarUrl?: string;
  parentId: string | null;
  invitedById: string | null;
  invitedByName: string;
  invitedByEmail: string;
  invitedByRole: Role | "";
  deletedAt?: string | null;
  createdAt: string;
};

export type DashboardMetrics = {
  teamSize: number;
  verifications: number;
  reports: number;
  tuJsonPdfReports?: number;
  experianJsonPdfReports?: number;
  trend: number[];
  trendLabels?: string[];
  trendPeriod?: string;
};

export type AlertItem = {
  id: string;
  message: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Invite = {
  id: string;
  email: string;
  name: string;
  targetRole: Role;
  senderRole: Role;
  permissions: string[];
  status: string;
  createdAt: string;
};

export type Plan = {
  id: string;
  ownerId: string | null;
  ownerRole: Role;
  audienceRole: Role;
  name: string;
  price?: number;
  credits?: number;
  services: string[];
  serviceRates: Array<{ service: string; cost: number }>;
  audienceUserId: string | null;
  audienceUserName: string;
  audienceUserEmail: string;
  purchaseCount: number;
  active: boolean;
};

export type WalletTransaction = {
  id: string;
  type: "credit" | "debit";
  source: string;
  amount: number;
  connectsDelta: number;
  balanceAfter: number;
  description: string;
  reference: string;
  invoiceId?: string;
  invoiceViewUrl?: string;
  invoiceDownloadUrl?: string;
  accountName?: string;
  accountEmail?: string;
  accountRole?: Role | "";
  createdAt: string;
};

export type WalletRate = {
  ratePaise: number;
  rupeesPerConnect: number;
};

export type BillingInvoice = {
  id: string;
  invoiceId: string;
  viewUrl: string;
  downloadUrl: string;
  amount: number;
  gstRate: number;
  gstAmount: number;
  walletCreditAmount: number;
  status: string;
  userName?: string;
  userEmail?: string;
  userRole?: Role | "";
  paidAt: string;
  createdAt: string;
};

export type BillingSettings = {
  firmName: string;
  firmAddress: string;
  supplierPincode: string;
  supplierStateCode: string;
  supplierState: string;
  supplierGstin: string;
  supplierPan: string;
  supplierPhone: string;
  supplierEmail: string;
  sacCode: string;
};

export type WalletSummary = {
  walletKey: string;
  balance: number;
  balanceUnits: number;
  rate: WalletRate;
  transactions: WalletTransaction[];
  userBalances?: Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    status: string;
    balance: number;
    balanceUnits: number;
  }>;
  transactionsPagination?: PaginationMeta;
  latestInvoice?: BillingInvoice;
};

export type WalletRechargeOrder = {
  orderId: string;
  paymentSessionId: string;
  amountPaise: number;
  amount: number;
  payableAmountPaise: number;
  payableAmount: number;
  gstRate: number;
  gstAmountPaise: number;
  gstAmount: number;
  walletCreditAmountPaise: number;
  roundingAdjustmentPaise: number;
  roundingAdjustment: number;
  walletCreditAmount: number;
  currency: string;
  connects: number;
  name: string;
  description: string;
  provider: "cashfree";
  mode: "sandbox" | "production";
};

export type ActivityItem = {
  id: string;
  actor: string;
  role: Role;
  action: string;
  service: string;
  createdAt: string;
};

export type NotificationItem = ActivityItem & {
  read: boolean;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type PaginatedResponse<T> = T[] | {
  items: T[];
  pagination: PaginationMeta;
};

export type ApiPricing = {
  tuCibilPdf: number;
  tuCibilJson: number;
  equifaxCibilPdf: number;
  equifaxCibilJson: number;
  crifPdf: number;
  crifJson: number;
  panFullDetail: number;
  aadhaarValidation: number;
  aadhaarOtp: number;
  uanFetchByPan: number;
  uanProfileDetails: number;
  employmentHistory: number;
  epfoPassbook: number;
  gstinVerification: number;
  bankVerification: number;
  drivingLicense: number;
  rcBasic: number;
  experianJson: number;
  experianPdf: number;
  faceMatch: number;
  mcaCompany: number;
  prefill: number;
  esign: number;
  econsent: number;
};

export type ApiPricingPayload = {
  user: UserAccount | null;
  permissions: string[];
  pricing: ApiPricing;
};

export type VerificationResult = {
  id: string;
  service: string;
  status: string;
  customerName: string;
  identifierMasked: string;
  score: number | null;
  riskBand: string;
  createdAt?: string;
  completedAt: string;
  providerReference?: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: Role | "";
  details?: Record<string, unknown>;
  hasReportFile?: boolean;
  reportFileName?: string;
  reportContentType?: string;
  reportFileDataUrl?: string;
};

export type VerificationListResponse = {
  items: VerificationResult[];
  pagination: PaginationMeta;
};

export type TuJsonPdfDocument = {
  id: string;
  customerName: string;
  score: number | null;
  accountCount: number;
  inquiryCount: number;
  controlNumber: string;
  sourceSchema: string;
  pageCount: number;
  fileName: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: Role | "";
  createdAt: string | null;
};

export type TuJsonPdfListResponse = {
  items: TuJsonPdfDocument[];
  pagination: PaginationMeta;
};

export type ExperianPdfDocument = {
  id: string;
  verificationId: string;
  customerName: string;
  score: number | null;
  accountCount: number;
  inquiryCount: number;
  reportNumber: string;
  pageCount: number;
  fileName: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: Role | "";
  createdAt: string | null;
};

export type ExperianPdfListResponse = {
  items: ExperianPdfDocument[];
  pagination: PaginationMeta;
};

export type UsageReportService = {
  value: string;
  label: string;
};

export type UsageReportUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type UsageReportRecord = {
  id: string;
  service: string;
  serviceLabel: string;
  status: string;
  customerName: string;
  identifierMasked: string;
  providerReference: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole: Role | "";
  createdAt: string;
};

export type UsageReportPayload = {
  filters: {
    dateFrom: string;
    dateTo: string;
    userId: string;
    service: string;
  };
  users: UsageReportUser[];
  services: UsageReportService[];
  records: {
    items: UsageReportRecord[];
    pagination: PaginationMeta;
  };
};

export type VerificationServiceKind =
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

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const SESSION_KEY = "dhaara-session";
let pendingRequests = 0;

export type StoredSession = {
  token: string;
  user: UserAccount;
  lastActivityAt: number;
  lastSyncedAt?: number;
};

export function readStoredSession(): StoredSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function writeStoredSession(session: StoredSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function setApiLoading(delta: number) {
  pendingRequests = Math.max(0, pendingRequests + delta);
  window.dispatchEvent(new CustomEvent("dhaara-api-loading", { detail: { pending: pendingRequests } }));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readStoredSession()?.token;
  setApiLoading(1);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {})
      },
      ...init
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      const errorMessage =
        typeof error?.message === "string" && error.message.trim()
          ? error.message
          : typeof error?.error === "string" && error.error.trim()
            ? error.error
            : typeof error?.detail === "string" && error.detail.trim()
              ? error.detail
              : "Request failed";
      if (response.status === 401 && token && !path.startsWith("/auth/login")) {
        window.dispatchEvent(new CustomEvent("dhaara-session-expired"));
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  } finally {
    setApiLoading(-1);
  }
}

async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  const token = readStoredSession()?.token;
  setApiLoading(1);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {})
      },
      ...init
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(typeof error?.message === "string" ? error.message : "Request failed");
    }

    return response.blob();
  } finally {
    setApiLoading(-1);
  }
}

function toQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return "";
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function itemsOnly<T>(response: PaginatedResponse<T>): T[] {
  return Array.isArray(response) ? response : response.items;
}

export const api = {
  login(email: string, password: string) {
    return request<{ token: string; user: UserAccount }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  bootstrap() {
    return request<{
      dashboard: DashboardMetrics;
      notifications: NotificationItem[];
    }>("/bootstrap");
  },
  me() {
    return request<{ user: UserAccount }>("/auth/me");
  },
  logout() {
    return request<{ ok: boolean }>("/auth/logout", { method: "POST" });
  },
  requestForgotPasswordOtp(email: string) {
    return request<{ ok: boolean; message: string }>("/auth/forgot-password/request", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  },
  verifyForgotPasswordOtp(email: string, otp: string) {
    return request<{ ok: boolean; resetToken: string; message: string }>("/auth/forgot-password/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp })
    });
  },
  resetForgotPassword(payload: { email: string; resetToken: string; password: string; confirmPassword: string }) {
    return request<{ ok: boolean; message: string }>("/auth/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateProfile(payload: {
    name: string;
    email: string;
    password?: string;
    avatarUrl?: string;
    roadStreet?: string;
    pincode?: string;
    stateCode?: string;
    gstin?: string;
    pan?: string;
    contact?: string;
  }) {
    return request<{ user: UserAccount }>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  regeneratePublicApiToken() {
    return request<{ user: UserAccount }>("/users/me/api-token", { method: "POST" });
  },
  updateUserStatus(userId: string, status: "active" | "suspended") {
    return request<{ user: UserAccount }>(`/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  },
  deleteUser(userId: string) {
    return request<{ deleted: boolean; userId: string; deletedAt: string }>(`/users/${userId}`, {
      method: "DELETE"
    });
  },
  updateUserPermissions(userId: string, permissions: string[]) {
    return request<{ user: UserAccount }>(`/users/${userId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions })
    });
  },
  updateUserPassword(userId: string, password: string) {
    return request<{ user: UserAccount }>(`/users/${userId}/password`, {
      method: "PATCH",
      body: JSON.stringify({ password })
    });
  },
  submitKycAadhaar(aadhaarNumber: string) {
    return request<{ user: UserAccount }>("/kyc/aadhaar", {
      method: "POST",
      body: JSON.stringify({ aadhaarNumber })
    });
  },
  submitKycEsign(phone: string) {
    return request<{ user: UserAccount }>("/kyc/esign", {
      method: "POST",
      body: JSON.stringify({ phone })
    });
  },
  fetchKycEsignStatus() {
    return request<{ user: UserAccount }>("/kyc/esign/status", { method: "POST" });
  },
  fetchUserKycEsignStatus(userId: string) {
    return request<{ kycStatus: string; kyc: UserAccount["kyc"] }>(`/kyc/${userId}/esign/status`, { method: "POST" });
  },
  submitKycPan(payload: { panNumber: string; fullName: string; dob: string }) {
    return request<{ user: UserAccount }>("/kyc/pan", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  approveKyc(userId: string) {
    return request<{ kycStatus: string; kyc: UserAccount["kyc"] }>(`/kyc/${userId}/approve`, { method: "POST" });
  },
  rejectKyc(userId: string, payload: {
    issues: {
      aadhaar: { selected: boolean; reason: string };
      pan: { selected: boolean; reason: string };
      esign: { selected: boolean; reason: string };
    };
  }) {
    return request<{ kycStatus: string; kyc: UserAccount["kyc"] }>(`/kyc/${userId}/reject`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  dashboard() {
    return request<DashboardMetrics>("/dashboard");
  },
  users(params?: { page?: number; limit?: number }) {
    return request<PaginatedResponse<UserAccount>>(`/users${toQuery(params)}`).then(itemsOnly);
  },
  usersPage(params?: {
    page?: number;
    limit?: number;
    search?: string;
    kyc?: "all" | "verified" | "unverified";
    status?: "all" | "active" | "not_active" | "blocked";
  }) {
    return request<{ items: UserAccount[]; pagination: PaginationMeta }>(`/users${toQuery(params)}`);
  },
  invites() {
    return request<Invite[]>("/invites");
  },
  createInvite(payload: {
    targetRole: Role;
    email: string;
    name: string;
    password: string;
    permissions: string[];
    roadStreet?: string;
    pincode?: string;
    stateCode?: string;
    gstin?: string;
    pan?: string;
    contact?: string;
  }) {
    return request<Invite>("/invites", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  plans() {
    return request<Plan[]>("/plans");
  },
  plansPage(params?: { page?: number; limit?: number; search?: string; filter?: "all" | "mine" }) {
    return request<{ items: Plan[]; pagination: PaginationMeta }>(`/plans${toQuery(params)}`);
  },
  createPlan(payload: {
    audienceRole: Role;
    audienceUser?: string;
    name?: string;
    services: string[];
    serviceRates: Array<{ service: string; cost: number }>;
  }) {
    return request<Plan>("/plans", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updatePlan(planId: string, payload: {
    name?: string;
    services: string[];
    serviceRates: Array<{ service: string; cost: number }>;
  }) {
    return request<Plan>(`/plans/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  deletePlan(planId: string) {
    return request<{ ok: boolean }>(`/plans/${planId}`, { method: "DELETE" });
  },
  purchasePlan(planId: string) {
    return request<{ user: UserAccount; plan: Plan }>("/plans/purchase", {
      method: "POST",
      body: JSON.stringify({ planId })
    });
  },
  wallet(params?: { page?: number; limit?: number; search?: string }) {
    return request<WalletSummary>(`/wallet${toQuery(params)}`);
  },
  updateUserWalletBalance(userId: string, balance: number) {
    return request<WalletSummary>(`/wallet/users/${userId}/balance`, {
      method: "PATCH",
      body: JSON.stringify({ balance })
    });
  },
  createWalletRechargeOrder(amount: number) {
    return request<WalletRechargeOrder>("/wallet/recharge/order", {
      method: "POST",
      body: JSON.stringify({ amount })
    });
  },
  verifyWalletRecharge(payload: { orderId: string }) {
    return request<WalletSummary>("/wallet/recharge/verify", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  walletInvoices(params?: { page?: number; limit?: number; search?: string; dateFrom?: string; dateTo?: string }) {
    return request<{ items: BillingInvoice[]; pagination?: PaginationMeta }>(`/wallet/invoices${toQuery(params)}`);
  },
  walletInvoiceFile(invoiceId: string, action: "view" | "download") {
    return requestBlob(`/wallet/invoices/${encodeURIComponent(invoiceId)}/${action}`);
  },
  walletRate() {
    return request<WalletRate>("/system/wallet-rate");
  },
  updateWalletRate(rupeesPerConnect: number) {
    return request<WalletRate>("/system/wallet-rate", {
      method: "PUT",
      body: JSON.stringify({ rupeesPerConnect })
    });
  },
  apiPricing(userId?: string) {
    return request<ApiPricingPayload>(`/system/api-pricing${toQuery({ userId })}`);
  },
  updateApiPricing(payload: { userId: string; pricing: ApiPricing }) {
    return request<ApiPricingPayload>("/system/api-pricing", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  helpContact() {
    return request<{ whatsappNumber: string }>("/system/help-contact");
  },
  contactEmails() {
    return request<{ salesEmail: string; supportEmail: string }>("/system/contact-emails");
  },
  updateContactEmails(payload: { salesEmail: string; supportEmail: string }) {
    return request<{ salesEmail: string; supportEmail: string }>("/system/contact-emails", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  billingSettings() {
    return request<BillingSettings>("/system/billing-settings");
  },
  updateBillingSettings(payload: BillingSettings) {
    return request<BillingSettings>("/system/billing-settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  alerts() {
    return request<AlertItem[]>("/system/alerts");
  },
  updateAlerts(alerts: AlertItem[]) {
    return request<AlertItem[]>("/system/alerts", {
      method: "PUT",
      body: JSON.stringify({ alerts })
    });
  },
  activity(params?: { page?: number; limit?: number }) {
    return request<PaginatedResponse<ActivityItem>>(`/activity${toQuery(params)}`).then(itemsOnly);
  },
  activityPage(params?: { page?: number; limit?: number; search?: string; dateFrom?: string; dateTo?: string }) {
    return request<{ items: ActivityItem[]; pagination: PaginationMeta }>(`/activity${toQuery(params)}`);
  },
  usageReport(params?: { dateFrom?: string; dateTo?: string; userId?: string; service?: string; page?: number; limit?: number }) {
    return request<UsageReportPayload>(`/reports/usage${toQuery(params)}`);
  },
  downloadUsageReport(params?: { dateFrom?: string; dateTo?: string; userId?: string; service?: string }) {
    return requestBlob(`/reports/usage/export${toQuery(params)}`);
  },
  tuJsonPdfDocuments(params?: { page?: number; limit?: number; search?: string }) {
    return request<TuJsonPdfListResponse>(`/tu-json-pdf/documents${toQuery(params)}`);
  },
  generateTuJsonPdf(payload: Record<string, unknown>) {
    return request<TuJsonPdfDocument>("/tu-json-pdf/convert", {
      method: "POST",
      body: JSON.stringify({ payload })
    });
  },
  tuJsonPdfFile(documentId: string, download = false) {
    return requestBlob(`/tu-json-pdf/documents/${encodeURIComponent(documentId)}${download ? "?download=1" : ""}`);
  },
  notifications(params?: { page?: number; limit?: number }) {
    return request<PaginatedResponse<NotificationItem>>(`/activity/notifications${toQuery(params)}`).then(itemsOnly);
  },
  markNotificationRead(notificationId: string) {
    return request<{ ok: boolean }>(`/activity/notifications/${notificationId}/read`, { method: "POST" });
  },
  markAllNotificationsRead() {
    return request<{ ok: boolean }>("/activity/notifications/read-all", { method: "POST" });
  },
  verifications(service: VerificationServiceKind, params?: { page?: number; limit?: number; search?: string }) {
    return request<VerificationListResponse>(`/verify/${service}${toQuery(params)}`);
  },
  verificationDetail(service: VerificationServiceKind, verificationId: string) {
    return request<VerificationResult>(`/verify/${service}/${verificationId}`);
  },
  fetchEsignStatus(verificationId: string, service: "esign" | "econsent" = "esign") {
    return request<VerificationResult>(`/verify/${service}/${verificationId}/status`, { method: "POST" });
  },
  shareEConsent(verificationId: string) {
    return request<VerificationResult>(`/verify/econsent/${verificationId}/share`, { method: "POST" });
  },
  downloadEsignAuditTrail(verificationId: string, service: "econsent" = "econsent") {
    return requestBlob(`/verify/${service}/${verificationId}/audit-trail`);
  },
  downloadEsignSignedDocument(verificationId: string, service: "econsent" = "econsent") {
    return requestBlob(`/verify/${service}/${verificationId}/signed-document`);
  },
  verify(service: VerificationServiceKind, payload: Record<string, unknown>) {
    return request<VerificationResult>(`/verify/${service}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};
