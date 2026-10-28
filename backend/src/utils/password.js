import crypto from "node:crypto";

const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%";
const ALL = `${LOWER}${UPPER}${DIGITS}${SYMBOLS}`;

function randomChar(chars) {
  return chars[crypto.randomInt(0, chars.length)];
}

function shuffle(value) {
  const chars = value.split("");
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const nextIndex = crypto.randomInt(0, index + 1);
    [chars[index], chars[nextIndex]] = [chars[nextIndex], chars[index]];
  }
  return chars.join("");
}

export function generateTemporaryPassword(length = 14) {
  const required = [randomChar(LOWER), randomChar(UPPER), randomChar(DIGITS), randomChar(SYMBOLS)];
  const remaining = Array.from({ length: Math.max(length - required.length, 0) }, () => randomChar(ALL));
  return shuffle([...required, ...remaining].join(""));
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export function passwordRequirements(password) {
  const value = String(password || "");
  return {
    minLength: value.length >= 8,
    lowercase: /[a-z]/.test(value),
    uppercase: /[A-Z]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-z0-9]/.test(value)
  };
}

export function isStrongPassword(password) {
  return Object.values(passwordRequirements(password)).every(Boolean);
}
