// Shared redaction for anything persisted to the Error/Request log store —
// these are read by Ops staff, not the tenant, but secrets/PII still must
// never be written to Mongo in the clear.

const SENSITIVE_KEYS = /password|token|secret|authorization|cookie|apikey|api_key|pin\b|otp/i;

export function redact<T>(value: T, depth = 3): T {
  if (depth <= 0 || value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth - 1)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.test(key) ? '[REDACTED]' : redact(val, depth - 1);
    }
    return out as unknown as T;
  }
  return value;
}

export function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  return redact(headers, 2);
}
