import { mapTuJsonPayload } from "../tu-json-pdf/tu-json-pdf.mapper.js";

export function mapExperianJsonPayload(payload, fallback = {}) {
  const inProfile = findObject(payload, "INProfileResponse");
  if (!inProfile) {
    throw new Error("Satmat response does not contain an Experian INProfileResponse report.");
  }

  const mapped = mapTuJsonPayload({ INProfileResponse: inProfile });
  const report = mapped.report;
  const currentApplication = inProfile.Current_Application || {};
  const currentDetails =
    currentApplication.Current_Application_Details ||
    currentApplication.CurrentApplicationDetails ||
    {};
  const currentApplicant =
    currentDetails.Current_Applicant_Details ||
    currentDetails.CurrentApplicantDetails ||
    {};
  const currentOther =
    currentDetails.Current_Other_Details ||
    currentDetails.CurrentOtherDetails ||
    {};
  const currentAddresses = array(
    currentDetails.Current_Applicant_Address_Details ||
      currentDetails.CurrentApplicantAddressDetails
  );
  const providerAddress = currentAddresses
    .map((address) =>
      [
        address.FlatNoPlotNoHouseNo,
        address.BldgNoSocietyName,
        address.RoadNoNameAreaLocality,
        address.Landmark,
        address.City,
        address.State,
        address.PINCode
      ]
        .map(clean)
        .filter(Boolean)
        .join(", ")
    )
    .filter(Boolean)
    .join(" | ");
  const customerName =
    joinName(currentApplicant) ||
    joinName(currentDetails) ||
    joinName(fallback) ||
    useful(report?.customer?.name);
  const customerDob = useful(
    currentApplicant.DateOfBirthApplicant,
    currentApplicant.Date_Of_Birth_Applicant,
    currentApplicant.DateOfBirth,
    fallback.dob,
    report?.customer?.dob
  );
  const customerGender = useful(
    currentApplicant.GenderCode,
    currentApplicant.Gender_Code,
    currentApplicant.Gender,
    fallback.gender,
    report?.customer?.gender
  );
  const customerPan = useful(
    currentApplicant.IncomeTaxPan,
    currentApplicant.Income_TAX_PAN,
    currentApplicant.PAN,
    fallback.pan,
    report?.customer?.pan
  );
  const customerMobile = useful(
    currentApplicant.MobilePhoneNumber,
    currentApplicant.Telephone_Number_Applicant_1st,
    fallback.mobile,
    report?.customer?.mobile
  );
  const customerEmail = useful(
    currentApplicant.EMailId,
    currentApplicant.EmailId,
    fallback.email,
    report?.customer?.email
  );
  const customerAddress = useful(providerAddress, fallback.address, report?.customer?.address);
  const customerPincode = useful(
    currentAddresses[0]?.PINCode,
    fallback.pincode,
    report?.customer?.pincode
  );

  report.reportNumber = clean(
    inProfile?.CreditProfileHeader?.ReportNumber ||
      inProfile?.CreditProfileHeader?.Report_Number ||
      inProfile?.CreditProfileHeader?.EnquiryNumber ||
      report.controlNumber
  );
  report.reportDate = clean(
    inProfile?.CreditProfileHeader?.ReportDate ||
      inProfile?.CreditProfileHeader?.Report_Date ||
      inProfile?.CreditProfileHeader?.ReportTime
  );
  report.customer = {
    ...(report.customer || {}),
    name: customerName,
    dob: customerDob,
    gender: customerGender,
    pan: customerPan,
    mobile: customerMobile,
    email: customerEmail,
    address: customerAddress,
    pincode: customerPincode
  };
  report.currentApplication = {
    name: customerName,
    pan: customerPan,
    dob: customerDob,
    gender: customerGender,
    income: useful(currentOther.Income, currentDetails.Income, currentDetails.MonthlyIncome),
    occupation: useful(
      currentOther.Employment_Status,
      currentDetails.OccupationCode,
      currentDetails.Occupation
    ),
    applicationAmount: clean(
      currentDetails.AmountFinanced ||
        currentDetails.Amount_Financed ||
        currentDetails.CurrentApplicationAmount
    ),
    duration: clean(currentDetails.DurationOfAgreement || currentDetails.Duration_Of_Agreement)
  };

  return { report, sourceSchema: "satmat-experian-inprofile-v2" };
}

function findObject(value, key, depth = 0) {
  if (!value || typeof value !== "object" || depth > 10) return null;
  if (value[key] && typeof value[key] === "object") return value[key];
  for (const child of Object.values(value)) {
    const found = findObject(child, key, depth + 1);
    if (found) return found;
  }
  return null;
}

function joinName(value) {
  return [
    value.firstName || value.FirstName || value.First_Name,
    value.middleName || value.MiddleName || value.Middle_Name,
    value.lastName || value.LastName || value.Last_Name
  ]
    .map(clean)
    .filter(Boolean)
    .join(" ");
}

function array(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? [value] : [];
}

function useful(...values) {
  return values.map(clean).find((value) => value && value !== "-") || "";
}

function clean(value) {
  return String(value ?? "").trim();
}
