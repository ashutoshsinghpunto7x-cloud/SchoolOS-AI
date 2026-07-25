// In-process error event ring buffer for the Ops Center Error Monitoring
// screen. Single-process only (same limitation as metrics.ts/security-events.ts)
// — resets on restart. Populated from errorHandler.ts for everything EXCEPT
// 401/403, which already have their own view in Security Center — mixing the
// two would just be noise between screens covering the same events.

export type ErrorEventSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ErrorEvent {
  id: string;
  severity: ErrorEventSeverity;
  statusCode: number;
  code: string;
  message: string;
  path?: string;
  method?: string;
  userId?: string;
  role?: string;
  schoolId?: string;
  stack?: string;
  createdAt: string;
}

const MAX_EVENTS = 500;
const events: ErrorEvent[] = [];
let seq = 0;

function severityFor(statusCode: number): ErrorEventSeverity {
  if (statusCode >= 500) return 'critical';
  if (statusCode === 409) return 'high';
  if (statusCode === 404) return 'low';
  return 'medium';
}

export function recordErrorEvent(event: Omit<ErrorEvent, 'id' | 'createdAt' | 'severity'>): void {
  events.push({ ...event, severity: severityFor(event.statusCode), id: String(++seq), createdAt: new Date().toISOString() });
  if (events.length > MAX_EVENTS) events.shift();
}

export function getErrorEvents(limit = 100): ErrorEvent[] {
  return events.slice(-limit).reverse();
}

export interface ErrorSummary {
  total: number;
  serverErrors: number;
  validationErrors: number;
  notFoundErrors: number;
  conflictErrors: number;
}

export function getErrorSummary(windowMs = 24 * 60 * 60 * 1000): ErrorSummary {
  const cutoff = Date.now() - windowMs;
  const recent = events.filter((e) => new Date(e.createdAt).getTime() >= cutoff);

  return {
    total: recent.length,
    serverErrors: recent.filter((e) => e.statusCode >= 500).length,
    validationErrors: recent.filter((e) => e.statusCode === 400).length,
    notFoundErrors: recent.filter((e) => e.statusCode === 404).length,
    conflictErrors: recent.filter((e) => e.statusCode === 409).length,
  };
}
