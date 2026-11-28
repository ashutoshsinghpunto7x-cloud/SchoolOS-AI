// ── Deterministic date-range parsing ─────────────────────────────────────────
// "last month", "last 30 days", "this week", "pichle mahine" … resolved with
// plain code (no LLM) so a follow-up like "what about last month?" can never be
// mis-dated by a model. All dates are YYYY-MM-DD, computed from the `today` the
// caller supplies (IST today in production, a fixed date in tests).

export interface DateRange {
  from: string;
  to: string;
  /** Human label echoed back in the answer, e.g. "last 30 days". */
  label: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function parse(dateISO: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateISO.split('-').map(Number);
  return { y, m, d };
}

export function shiftDays(dateISO: string, days: number): string {
  const { y, m, d } = parse(dateISO);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

function monthRange(y: number, m: number, label: string): DateRange {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: iso(y, m, 1), to: iso(y, m, last), label };
}

export const DEFAULT_RANGE_DAYS = 30;

export function defaultRange(today: string): DateRange {
  return { from: shiftDays(today, -(DEFAULT_RANGE_DAYS - 1)), to: today, label: `last ${DEFAULT_RANGE_DAYS} days` };
}

/** Returns null when the message names no period at all (so callers can keep the previous one). */
export function parseDateRange(message: string, today: string): DateRange | null {
  const m = message.toLowerCase();
  const { y, m: month } = parse(today);

  if (/\blast\s+month\b|\bprevious\s+month\b|pichle\s+mah?ine|पिछले\s+महीने/.test(m)) {
    const prev = month === 1 ? { y: y - 1, m: 12 } : { y, m: month - 1 };
    return monthRange(prev.y, prev.m, 'last month');
  }
  if (/\bthis\s+month\b|is\s+mah?ine|इस\s+महीने/.test(m)) {
    return { from: iso(y, month, 1), to: today, label: 'this month' };
  }
  const lastN = m.match(/\b(?:last|past|previous)\s+(\d{1,3})\s+days?\b/);
  if (lastN) {
    const n = Math.min(365, Math.max(1, Number(lastN[1])));
    return { from: shiftDays(today, -(n - 1)), to: today, label: `last ${n} days` };
  }
  if (/\blast\s+week\b|pichle\s+(?:hafte|saptah)|पिछले\s+सप्ताह/.test(m)) {
    return { from: shiftDays(today, -13), to: shiftDays(today, -7), label: 'last week' };
  }
  if (/\bthis\s+week\b|is\s+(?:hafte|saptah)|इस\s+सप्ताह/.test(m)) {
    return { from: shiftDays(today, -6), to: today, label: 'last 7 days' };
  }
  if (/\btoday\b|\baaj\b|आज/.test(m)) {
    return { from: today, to: today, label: 'today' };
  }
  if (/\byesterday\b|बीते\s+कल/.test(m)) {
    const d = shiftDays(today, -1);
    return { from: d, to: d, label: 'yesterday' };
  }
  return null;
}
