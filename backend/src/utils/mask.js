export function maskIdentifier(identifier) {
  const suffix = String(identifier || "").replace(/\s/g, "").slice(-4) || "0000";
  return `**** ${suffix}`;
}
