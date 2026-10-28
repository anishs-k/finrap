const verhoeffD = [
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

const verhoeffP = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

export function normalizeAadhaar(value) {
  return String(value || "").replace(/\D/g, "");
}

export function isValidAadhaar(value) {
  const aadhaar = normalizeAadhaar(value);
  if (!/^[2-9]\d{11}$/.test(aadhaar) || /^(\d)\1{11}$/.test(aadhaar)) return false;

  let checksum = 0;
  const reversed = aadhaar.split("").reverse().map(Number);
  for (let index = 0; index < reversed.length; index += 1) {
    checksum = verhoeffD[checksum][verhoeffP[index % 8][reversed[index]]];
  }
  return checksum === 0;
}

export function maskAadhaar(value) {
  const aadhaar = normalizeAadhaar(value);
  return aadhaar ? `XXXX-XXXX-${aadhaar.slice(-4)}` : "";
}

export function normalizePan(value) {
  return String(value || "").trim().toUpperCase();
}

export function isValidPan(value) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalizePan(value));
}

export function maskPan(value) {
  const pan = normalizePan(value);
  return pan ? `${pan.slice(0, 2)}XXX${pan.slice(5, 9)}X` : "";
}
