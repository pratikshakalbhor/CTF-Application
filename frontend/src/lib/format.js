import { formatUnits, parseUnits } from "ethers";

/** Format a raw token amount (bigint) into a readable string. */
export function formatAmount(value, decimals = 18, maxFractionDigits = 4) {
  if (value === null || value === undefined) return "-";
  let raw;
  try {
    raw = formatUnits(value, decimals);
  } catch {
    return String(value);
  }
  const negative = raw.startsWith("-");
  const clean = negative ? raw.slice(1) : raw;
  const [intPart, fracPart = ""] = clean.split(".");
  const grouped = Number(intPart).toLocaleString("en-US");
  let frac = fracPart.slice(0, maxFractionDigits).replace(/0+$/, "");
  const result = frac ? `${grouped}.${frac}` : grouped;
  return negative ? `-${result}` : result;
}

/** Parse a human string like "1000.5" into a raw token amount (bigint). */
export function parseAmount(value, decimals = 18) {
  return parseUnits(String(value).trim(), decimals);
}

export function shortAddress(address, chars = 4) {
  if (!address) return "-";
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function bpsToPercent(bps) {
  const value = Number(bps) / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}

/** Split a raw price into burn / treasury parts using basis points. */
export function splitPrice(price, burnBps) {
  const amount = BigInt(price ?? 0);
  const bps = BigInt(burnBps ?? 0);
  const burn = (amount * bps) / 10_000n;
  return { burn, treasury: amount - burn };
}

export function formatClock(date) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString();
}
