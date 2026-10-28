const ACCOUNT_TYPES = {
  "00": "OTHER",
  "01": "AUTO LOAN (PERSONAL)",
  "02": "HOUSING LOAN",
  "03": "PROPERTY LOAN",
  "04": "LOAN AGAINST SHARES / SECURITIES",
  "05": "PERSONAL LOAN",
  "06": "CONSUMER LOAN",
  "07": "GOLD LOAN",
  "08": "EDUCATION LOAN",
  "09": "LOAN TO PROFESSIONAL",
  "10": "CREDIT CARD",
  "11": "LEASING",
  "12": "OVERDRAFT",
  "13": "TWO WHEELER LOAN",
  "14": "NON-FUNDED CREDIT FACILITY",
  "15": "LOAN AGAINST BANK DEPOSIT",
  "16": "FLEET CARD",
  "17": "COMMERCIAL VEHICLE LOAN",
  "31": "SECURED CREDIT CARD",
  "32": "USED CAR LOAN",
  "33": "CONSTRUCTION EQUIPMENT LOAN",
  "34": "TRACTOR LOAN",
  "35": "CORPORATE CREDIT CARD",
  "36": "KISAN CREDIT CARD",
  "37": "LOAN ON CREDIT CARD",
  "38": "JAN-DHAN YOJANA OVERDRAFT",
  "39": "MUDRA LOAN",
  "40": "MICROFINANCE - BUSINESS LOAN",
  "41": "MICROFINANCE - PERSONAL LOAN",
  "42": "MICROFINANCE - HOUSING LOAN",
  "43": "MICROFINANCE - OTHER",
  "44": "PRADHAN MANTRI AWAS YOJANA",
  "45": "P2P PERSONAL LOAN",
  "46": "P2P AUTO LOAN",
  "47": "P2P EDUCATION LOAN",
  "48": "BUSINESS LOAN - UNSECURED",
  "50": "BUSINESS LOAN - SECURED",
  "51": "BUSINESS LOAN - GENERAL"
};

const OWNERSHIP_TYPES = {
  "1": "Individual",
  "2": "Authorized User",
  "3": "Guarantor",
  "4": "Joint"
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

export function mapInProfileTuPayload(payload) {
  const profile = payload?.result?.result_json?.INProfileResponse || payload?.result_json?.INProfileResponse || payload?.INProfileResponse;
  if (!profile) throw new Error("The JSON does not contain a valid INProfile credit report payload.");

  const application = profile?.Current_Application?.Current_Application_Details || {};
  const applicant = application?.Current_Applicant_Details || {};
  const accountEntries = arrayOf(profile?.CAIS_Account?.CAIS_Account_DETAILS);
  const accounts = accountEntries.map(mapAccount);
  const inquiries = [
    ...arrayOf(profile?.CAPS?.CAPS_Application_Details),
    ...arrayOf(profile?.NonCreditCAPS?.NonCreditCAPS_Application_Details)
  ].map(mapInquiry);
  const identifiers = uniqueBy(
    [
      identifier("Income Tax PAN", applicant.IncomeTaxPan, applicant.PAN_Issue_Date, applicant.PAN_Expiration_Date),
      identifier("Passport", applicant.Passport_number, applicant.Passport_Issue_Date, applicant.Passport_Expiration_Date),
      identifier("Voter ID", applicant.Voter_s_Identity_Card, applicant.Voter_ID_Issue_Date, applicant.Voter_ID_Expiration_Date),
      identifier("Driving License", applicant.Driver_License_Number, applicant.Driver_License_Issue_Date, applicant.Driver_License_Expiration_Date),
      identifier("Ration Card", applicant.Ration_Card_Number, applicant.Ration_Card_Issue_Date, applicant.Ration_Card_Expiration_Date),
      identifier("Universal ID", applicant.Universal_ID_Number, applicant.Universal_ID_Issue_Date, applicant.Universal_ID_Expiration_Date),
      ...accountEntries.flatMap((entry) =>
        arrayOf(entry?.CAIS_Holder_ID_Details).flatMap((holder) => [
          identifier("Income Tax PAN", holder?.Income_TAX_PAN, holder?.PAN_Issue_Date, holder?.PAN_Expiration_Date),
          identifier("Passport", holder?.Passport_Number, holder?.Passport_Issue_Date, holder?.Passport_Expiration_Date),
          identifier("Voter ID", holder?.Voter_ID_Number, holder?.Voter_ID_Issue_Date, holder?.Voter_ID_Expiration_Date),
          identifier("Driving License", holder?.Driver_License_Number, holder?.Driver_License_Issue_Date, holder?.Driver_License_Expiration_Date),
          identifier("Ration Card", holder?.Ration_Card_Number, holder?.Ration_Card_Issue_Date, holder?.Ration_Card_Expiration_Date),
          identifier("Universal ID", holder?.Universal_ID_Number, holder?.Universal_ID_Issue_Date, holder?.Universal_ID_Expiration_Date)
        ])
      )
    ].filter((entry) => entry.number !== "-"),
    (entry) => `${entry.type}:${entry.number}`
  );
  const phones = uniqueBy(
    [
      phone("Mobile", applicant.MobilePhoneNumber),
      phone("Telephone", applicant.Telephone_Number_Applicant_1st, applicant.Telephone_Extension),
      ...accountEntries.flatMap((entry) =>
        arrayOf(entry?.CAIS_Holder_Phone_Details).flatMap((holder) => [
          phone("Mobile", holder?.Mobile_Telephone_Number),
          phone("Telephone", holder?.Telephone_Number, holder?.Telephone_Extension)
        ])
      )
    ].filter((entry) => entry.number !== "-"),
    (entry) => entry.number
  );
  const emails = unique([
    text(applicant.EMailId),
    ...accountEntries.flatMap((entry) => arrayOf(entry?.CAIS_Holder_Phone_Details).map((holder) => text(holder?.EMailId))),
    ...accountEntries.flatMap((entry) => arrayOf(entry?.CAIS_Holder_ID_Details).map((holder) => text(holder?.EMailId)))
  ].filter(Boolean));
  const addresses = uniqueBy(
    [
      ...arrayOf(application?.Current_Applicant_Address_Details).map(mapApplicantAddress),
      ...arrayOf(application?.Current_Applicant_Additional_AddressDetails).map(mapApplicantAddress),
      ...accountEntries.flatMap((entry) => arrayOf(entry?.CAIS_Holder_Address_Details).map(mapHolderAddress))
    ].filter((entry) => entry.address),
    (entry) => entry.address.toLowerCase()
  );
  const employers = uniqueBy(
    accountEntries
      .filter((entry) => text(entry?.Occupation_Code) || number(entry?.Income) > 0)
      .map((entry) => ({
        accountType: accountType(entry?.Account_Type),
        dateReported: formatDate(entry?.Date_Reported),
        occupation: text(entry?.Occupation_Code) || "-",
        income: amount(entry?.Income),
        netGross: incomeIndicator(entry?.Income_Indicator),
        frequency: incomeFrequency(entry?.Income_Frequency_Indicator)
      })),
    (entry) => `${entry.occupation}:${entry.income}:${entry.dateReported}`
  );
  const accountSummary = summarizeAccounts(accounts);
  const historyEntries = accounts.flatMap((account) => account.history);
  const onTimeEntries = historyEntries.filter((entry) => isOnTimeStatus(entry.status)).length;
  const creditLimits = accounts.filter(isCreditCard).reduce((total, account) => total + number(account.creditLimit), 0);
  const cardBalances = accounts.filter(isCreditCard).reduce((total, account) => total + number(account.currentBalance), 0);
  const totalCaps = profile?.TotalCAPS_Summary || {};
  const capsSummary = profile?.CAPS?.CAPS_Summary || {};
  const totalInquiryCount = inquiries.length || number(totalCaps.TotalCAPSLast180Days) || number(capsSummary.CAPSLast180Days);
  const oldestMonths = monthsSince(accountSummary.oldestDate);
  const header = profile?.CreditProfileHeader || profile?.Header || {};
  const customerName = [
    applicant.First_Name, applicant.Middle_Name1, applicant.Middle_Name2, applicant.Middle_Name3, applicant.Last_Name
  ].map(text).filter(Boolean).join(" ");

  return {
    provider: "TransUnion CIBIL",
    transactionId: text(payload?.request_id),
    clientId: text(payload?.client_ref_num),
    controlNumber: text(profile?.CreditProfileHeader?.ReportNumber || payload?.request_id) || "-",
    reportDate: formatDate(header.ReportDate || profile?.Header?.ReportDate),
    reportTime: formatTime(header.ReportTime || profile?.Header?.ReportTime),
    memberId: text(profile?.CreditProfileHeader?.Subscriber) || "-",
    memberReference: text(payload?.client_ref_num) || "-",
    customer: {
      name: customerName || holderName(accountEntries[0]) || "-",
      dob: formatDate(applicant.Date_Of_Birth_Applicant),
      gender: gender(applicant.Gender_Code)
    },
    score: {
      name: "CIBIL SCORE",
      value: amount(profile?.SCORE?.BureauScore),
      factors: [],
      populationRank: amount(profile?.SCORE?.BureauScoreConfidLevel)
    },
    creditSummary: {
      utilization: creditLimits > 0 ? `${Math.round((cardBalances / creditLimits) * 100)}%` : "-",
      creditMix: `${unique(accounts.map((account) => account.type).filter(Boolean)).length} account type(s)`,
      enquiries: String(totalInquiryCount || 0),
      oldestAccountPeriod: oldestMonths === null ? "-" : `${oldestMonths} months`,
      onTimePaymentHistory: historyEntries.length ? `${Math.round((onTimeEntries / historyEntries.length) * 100)}%` : "-"
    },
    identifiers,
    phones,
    emails,
    addresses,
    employers,
    accounts,
    accountSummary,
    inquiries,
    inquirySummary: {
      total: totalInquiryCount,
      past30Days: number(totalCaps.TotalCAPSLast30Days || capsSummary.CAPSLast30Days),
      past12Months: inquiries.filter((entry) => isRecent(entry.date, 365)).length,
      past24Months: inquiries.filter((entry) => isRecent(entry.date, 730)).length,
      recentDate: newestDate(inquiries.map((entry) => entry.date))
    },
    safetyCheckPassed: text(profile?.Match_result?.Exact_match) || "-",
    frozen: "-",
    deceasedIndicator: "-",
    fraudIndicator: "-"
  };
}

function mapAccount(entry = {}) {
  const closed = Boolean(text(entry.Date_Closed));
  const history = arrayOf(entry.CAIS_Account_History)
    .map((item) => ({ month: formatMonth(item?.Year, item?.Month), status: paymentStatus(item?.Days_Past_Due, item?.Asset_Classification) }))
    .filter((item) => item.month !== "-");
  return {
    lender: text(entry.Subscriber_Name) || "-",
    type: accountType(entry.Account_Type),
    accountNumber: text(entry.Account_Number) || "-",
    ownership: OWNERSHIP_TYPES[text(entry.AccountHoldertypeCode)] || text(entry.AccountHoldertypeCode) || "-",
    status: closed ? "Closed" : "Open",
    creditLimit: amount(entry.Credit_Limit_Amount),
    cashLimit: "-",
    highCredit: amount(entry.Highest_Credit_or_Original_Loan_Amount),
    currentBalance: amount(entry.Current_Balance),
    amountOverdue: amount(entry.Amount_Past_Due),
    interestRate: amount(entry.Rate_of_stringerest),
    emiAmount: amount(entry.Scheduled_Monthly_Payment_Amount),
    repaymentTenure: amount(entry.Repayment_Tenure || entry.Terms_Duration),
    actualPayment: amount(entry.Value_of_Credits_Last_Month),
    paymentFrequency: termsFrequency(entry.Terms_Frequency),
    dateOpened: formatDate(entry.Open_Date),
    dateClosed: formatDate(entry.Date_Closed),
    collateralType: text(entry.Type_of_Collateral) || "-",
    collateralValue: amount(entry.Value_of_Collateral),
    writtenOffTotal: amount(entry.Written_Off_Amt_Total || entry.Original_Charge_Off_Amount),
    writtenOffPrincipal: amount(entry.Written_Off_Amt_Principal),
    settlementAmount: amount(entry.Settlement_Amount),
    dateLastPayment: formatDate(entry.Date_of_Last_Payment),
    dateReported: formatDate(entry.Date_Reported),
    facilityStatus: closed ? "Closed" : text(entry.Account_Status) || "Active",
    historyFrom: history.at(-1)?.month || "-",
    historyTo: history[0]?.month || "-",
    history
  };
}

function mapInquiry(entry = {}) {
  return {
    member: text(entry.Subscriber_Name || entry.Member_Name || entry.Subscriber) || "-",
    date: formatDate(entry.Date_of_Request || entry.Enquiry_Date || entry.Date),
    purpose: accountType(entry.Enquiry_Reason || entry.Account_Type),
    amount: amount(entry.Amount_Financed || entry.Enquiry_Amount)
  };
}

function mapApplicantAddress(entry = {}) {
  const address = [
    entry.FlatNoPlotNoHouseNo, entry.BldgNoSocietyName, entry.RoadNoNameAreaLocality, entry.Landmark, entry.City,
    STATE_NAMES[text(entry.State).padStart(2, "0")] || entry.State, entry.PINCode
  ].map(text).filter(Boolean).join(", ");
  return { address, category: "Current", residenceCode: "-", dateReported: "-" };
}

function mapHolderAddress(entry = {}) {
  const address = [
    entry.First_Line_Of_Address_non_normalized, entry.Second_Line_Of_Address_non_normalized,
    entry.Third_Line_Of_Address_non_normalized, entry.City_non_normalized, entry.Fifth_Line_Of_Address_non_normalized,
    STATE_NAMES[text(entry.State_non_normalized).padStart(2, "0")] || entry.State_non_normalized,
    entry.ZIP_Postal_Code_non_normalized
  ].map(text).filter(Boolean).join(", ");
  return {
    address,
    category: addressCategory(entry.Address_indicator_non_normalized),
    residenceCode: text(entry.Residence_code_non_normalized) || "-",
    dateReported: "-"
  };
}

function summarizeAccounts(accounts) {
  const dates = accounts.map((entry) => entry.dateOpened).filter((entry) => entry !== "-").sort(compareDates);
  return {
    total: accounts.length,
    active: accounts.filter((entry) => entry.status === "Open").length,
    closed: accounts.filter((entry) => entry.status === "Closed").length,
    zeroBalance: accounts.filter((entry) => number(entry.currentBalance) === 0).length,
    overdueAccounts: accounts.filter((entry) => number(entry.amountOverdue) > 0).length,
    currentBalance: accounts.reduce((total, entry) => total + number(entry.currentBalance), 0),
    sanctionedAmount: accounts.reduce((total, entry) => total + number(entry.highCredit), 0),
    overdueAmount: accounts.reduce((total, entry) => total + number(entry.amountOverdue), 0),
    oldestDate: dates[0] || "-",
    recentDate: dates.at(-1) || "-"
  };
}

function identifier(type, rawNumber, issueDate, expirationDate) {
  return { type, number: text(rawNumber) || "-", issueDate: formatDate(issueDate), expirationDate: formatDate(expirationDate) };
}

function phone(type, rawNumber, extension) {
  return { type, number: text(rawNumber) || "-", extension: text(extension) || "-" };
}

function holderName(entry = {}) {
  const holder = arrayOf(entry?.CAIS_Holder_Details)[0] || {};
  return [
    holder.First_Name_Non_Normalized, holder.Middle_Name_1_Non_Normalized, holder.Middle_Name_2_Non_Normalized,
    holder.Middle_Name_3_Non_Normalized, holder.Surname_Non_Normalized
  ].map(text).filter(Boolean).join(" ");
}

function accountType(code) {
  const raw = text(code);
  const normalized = raw.padStart(2, "0");
  return ACCOUNT_TYPES[normalized] || raw || "-";
}

function paymentStatus(dpd, classification) {
  const rawDpd = text(dpd);
  if (rawDpd && /^\d+$/.test(rawDpd)) {
    const numericDpd = Number(rawDpd);
    return numericDpd === 0 ? "STD" : String(numericDpd).padStart(3, "0");
  }
  return text(classification) || rawDpd || "-";
}

function isOnTimeStatus(status) {
  return ["STD", "000", "0", "XXX"].includes(text(status).toUpperCase());
}

function isCreditCard(account) {
  return account.type.includes("CREDIT CARD");
}

function gender(code) {
  const normalized = text(code).toUpperCase();
  if (["1", "M", "MALE"].includes(normalized)) return "Male";
  if (["2", "F", "FEMALE"].includes(normalized)) return "Female";
  if (["3", "T"].includes(normalized)) return "Transgender";
  return normalized || "-";
}

function addressCategory(code) {
  const normalized = text(code);
  if (["01", "1"].includes(normalized)) return "Permanent";
  if (["02", "2"].includes(normalized)) return "Residence";
  if (["03", "3"].includes(normalized)) return "Office";
  return normalized || "-";
}

function incomeIndicator(code) {
  const normalized = text(code);
  if (["N", "1"].includes(normalized)) return "Net";
  if (["G", "2"].includes(normalized)) return "Gross";
  return normalized || "-";
}

function incomeFrequency(code) {
  const normalized = text(code);
  return { M: "Monthly", A: "Annual", W: "Weekly", F: "Fortnightly", "1": "Monthly", "2": "Fortnightly", "3": "Weekly", "4": "Annual" }[normalized] || normalized || "-";
}

function termsFrequency(code) {
  const normalized = text(code);
  return { M: "Monthly", W: "Weekly", F: "Fortnightly", Q: "Quarterly", A: "Annual" }[normalized] || normalized || "-";
}

function formatDate(input) {
  const raw = text(input);
  if (!raw) return "-";
  if (/^\d{8}$/.test(raw)) {
    const firstFour = Number(raw.slice(0, 4));
    if (firstFour >= 1900 && firstFour <= 2200) return `${raw.slice(6, 8)}-${raw.slice(4, 6)}-${raw.slice(0, 4)}`;
    return `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 8)}`;
  }
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : raw;
}

function formatTime(input) {
  const raw = text(input).replace(/\D/g, "");
  if (raw.length < 4) return text(input) || "-";
  return `${raw.slice(0, 2)}:${raw.slice(2, 4)}${raw.length >= 6 ? `:${raw.slice(4, 6)}` : ""}`;
}

function formatMonth(year, month) {
  const yearText = text(year);
  const monthNumber = Number(month);
  if (!yearText || monthNumber < 1 || monthNumber > 12) return "-";
  return `${String(monthNumber).padStart(2, "0")}-${yearText}`;
}

function amount(input) {
  if (input === undefined || input === null || text(input) === "") return "-";
  const parsed = number(input);
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(parsed);
}

function number(input) {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  const parsed = Number(text(input).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthsSince(formattedDate) {
  const parsed = parseFormattedDate(formattedDate);
  if (!parsed) return null;
  const now = new Date();
  return Math.max(0, (now.getFullYear() - parsed.getFullYear()) * 12 + now.getMonth() - parsed.getMonth());
}

function isRecent(formattedDate, days) {
  const parsed = parseFormattedDate(formattedDate);
  if (!parsed) return false;
  const elapsed = Date.now() - parsed.getTime();
  return elapsed >= 0 && elapsed <= days * 86400000;
}

function newestDate(dates) {
  return dates.filter((entry) => entry && entry !== "-").sort(compareDates).at(-1) || "-";
}

function compareDates(left, right) {
  return (parseFormattedDate(left)?.getTime() || 0) - (parseFormattedDate(right)?.getTime() || 0);
}

function parseFormattedDate(input) {
  const match = text(input).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function arrayOf(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "object") {
    const numericEntries = Object.entries(value)
      .filter(([key]) => /^\d+$/.test(key))
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, entry]) => entry);
    if (numericEntries.length) return numericEntries.filter(Boolean);
  }
  return [value];
}

function unique(values) {
  return [...new Set(values)];
}

function uniqueBy(values, keyFor) {
  const seen = new Set();
  return values.filter((entry) => {
    const key = keyFor(entry);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function text(input) {
  if (input === undefined || input === null || typeof input === "object") return "";
  return String(input).trim();
}
