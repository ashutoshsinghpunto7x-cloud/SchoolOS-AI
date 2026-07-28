import { check } from 'k6';
import { recordHttpStatus } from './metrics.js';

// Standard per-request check + custom-metric recording, used by every
// scenario so 429/500 tracking and check() reporting stay consistent instead
// of each scenario re-implementing it slightly differently.
export function assertOk(res, name, expectedStatuses = [200, 201]) {
  recordHttpStatus(res);
  return check(res, {
    [`${name}: status is ${expectedStatuses.join('/')}`]: (r) => expectedStatuses.includes(r.status),
    [`${name}: no 5xx`]: (r) => r.status < 500,
    [`${name}: not rate-limited`]: (r) => r.status !== 429,
  });
}

// Detects duplicate rows in a list response by a caller-supplied key
// function — used after attendance.bulk / fee.payment to confirm the write
// didn't fan out into two documents for what should be a single
// student+date+class (or student+month) record.
export function hasDuplicates(items, keyFn) {
  const seen = new Set();
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export function safeJson(res) {
  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}
