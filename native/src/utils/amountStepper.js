/**
 * AmountStepper — 1:1 from web TTAmountStepper
 * oz/ml with +/- buttons
 */
const OZ_TO_ML = 29.5735;

export function formatOz(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  const fixed = Math.round(num * 100) / 100;
  return (fixed % 1 === 0) ? String(fixed) : String(fixed).replace(/0+$/, '').replace(/\.$/, '');
}

export function formatMl(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  return String(Math.max(0, Math.round(num)));
}

export function ozToMl(oz) {
  return Number(oz) * OZ_TO_ML;
}

export function mlToOz(ml) {
  return Number(ml) / OZ_TO_ML;
}
