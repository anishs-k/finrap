export function unitsToConnects(units) {
  return Number((Number(units || 0) / 100).toFixed(2));
}

export function rupeesToPaise(value) {
  return Math.round(Number(value) * 100);
}

export function paiseToRupees(value) {
  return Number((Number(value || 0) / 100).toFixed(2));
}

export function amountPaiseToConnectUnits(amountPaise, ratePaisePerConnect) {
  return Math.floor((Number(amountPaise) * 100) / Number(ratePaisePerConnect));
}
