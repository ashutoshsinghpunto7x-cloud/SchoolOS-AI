// In-process security event ring buffer for the Ops Center Security Center.
// Single-process only (same limitation as metrics.ts) — resets on restart,
// not shared across instances. Populated from errorHandler.ts (401/403) and
// rateLimiter.ts (429); never written to from tenant-facing code paths.

export type SecurityEventType = 'failed_login' | 'invalid_token' | 'permission_denied' | 'rate_limited';
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  ip?: string;
  path?: string;
  userId?: string;
  role?: string;
  schoolId?: string;
  createdAt: string;
}

const MAX_EVENTS = 500;
const events: SecurityEvent[] = [];
let seq = 0;

export function recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'createdAt'>): void {
  events.push({ ...event, id: String(++seq), createdAt: new Date().toISOString() });
  if (events.length > MAX_EVENTS) events.shift();
}

export function getSecurityEvents(limit = 100, schoolId?: string): SecurityEvent[] {
  const filtered = schoolId ? events.filter((e) => e.schoolId === schoolId) : events;
  return filtered.slice(-limit).reverse();
}

export interface SecuritySummary {
  failedLogins: number;
  invalidTokens: number;
  permissionViolations: number;
  rateLimited: number;
}

export function getSecuritySummary(windowMs = 24 * 60 * 60 * 1000): SecuritySummary {
  const cutoff = Date.now() - windowMs;
  const recent = events.filter((e) => new Date(e.createdAt).getTime() >= cutoff);
  const count = (t: SecurityEventType) => recent.filter((e) => e.type === t).length;
  return {
    failedLogins: count('failed_login'),
    invalidTokens: count('invalid_token'),
    permissionViolations: count('permission_denied'),
    rateLimited: count('rate_limited'),
  };
}
