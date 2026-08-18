// Currency and number formatting helpers for the Egyptian market.
// All figures render in Egyptian Pounds (ج.م) with Arabic-friendly numerals.

const CURRENCY = "ج.م";

/** Convert Western (0-9) digits to Arabic-Indic (٠-٩) digits. */
export function toArabicDigits(value: string | number): string {
  const str = String(value);
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return str.replace(/[0-9]/g, (d) => arabic[Number(d)]);
}

/** Format a number with thousands separators, then convert to Arabic digits. */
export function formatNumber(value: number | bigint): string {
  const num = typeof value === "bigint" ? Number(value) : value;
  const grouped = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(num);
  return toArabicDigits(grouped);
}

/** Format an amount as Egyptian Pounds, e.g. "١٬٢٥٠ ج.م". */
export function formatEGP(value: number | bigint): string {
  return `${formatNumber(value)} ${CURRENCY}`;
}

/** Format a percentage, e.g. "١٥٪". */
export function formatPercent(value: number): string {
  return `${toArabicDigits(value)}٪`;
}
