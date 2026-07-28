// In-process error event ring buffer for the Ops Center Error Monitoring
// screen (fast path for live tailing) plus a write-through to the durable
// OpsErrorEvent Mongo collection (error-event.model.ts) for historical
// breakdowns and root-cause search. Populated from errorHandler.ts for
// everything EXCEPT 401/403, which already have their own view in Security
// Center — mixing the two would just be noise between screens covering the
// same events.

import { ErrorEventModel } from './error-event.model';
import { classifyError, RootCauseCategory } from './root-cause-classifier';
import { redact, redactHeaders } from './redact';
import { getRequestContext } from '../middlewares/requestContext';
import { logger } from './logger';

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
  category: RootCauseCategory;
  confidencePercent: number;
  probableCause: string;
  recommendedFix: string;
  requestId?: string;
  createdAt: string;
}

export interface RecordErrorEventInput {
  statusCode: number;
  code: string;
  message: string;
  path?: string;
  method?: string;
  userId?: string;
  role?: string;
  schoolId?: string;
  stack?: string;
  requestBody?: Record<string, unknown>;
  headers?: Record<string, unknown>;
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

function moduleFor(path?: string): string {
  const match = path?.match(/^\/api\/v1\/([^/?]+)/);
  return match ? match[1] : 'other';
}

// First stack frame outside node_modules — the actual app code that threw,
// not the express/mongoose internals that wrap it.
function parseStackFrame(stack?: string): { fileName?: string; lineNumber?: number; functionName?: string } {
  if (!stack) return {};
  const lines = stack.split('\n').slice(1);
  const frame = lines.find((l) => !l.includes('node_modules') && l.includes('.ts')) ?? lines[0];
  if (!frame) return {};
  const match = frame.match(/at (?:(.+?)\s+\()?(?:.*[/\\])?([^/\\:]+):(\d+):\d+\)?/);
  if (!match) return {};
  return { functionName: match[1], fileName: match[2], lineNumber: match[3] ? Number(match[3]) : undefined };
}

export function recordErrorEvent(event: RecordErrorEventInput): void {
  const ctx = getRequestContext();
  const classification = classifyError({
    statusCode: event.statusCode,
    code: event.code,
    message: event.message,
    stack: event.stack,
    path: event.path,
  });
  const { fileName, lineNumber, functionName } = parseStackFrame(event.stack);
  const module = moduleFor(event.path);
  const createdAt = new Date();

  events.push({
    ...event,
    module,
    ...classification,
    severity: severityFor(event.statusCode),
    id: String(++seq),
    requestId: ctx?.requestId,
    createdAt: createdAt.toISOString(),
  } as ErrorEvent & { module: string });
  if (events.length > MAX_EVENTS) events.shift();

  ErrorEventModel.create({
    requestId: ctx?.requestId,
    correlationId: ctx?.correlationId,
    module,
    api: event.path,
    method: event.method,
    statusCode: event.statusCode,
    code: event.code,
    message: event.message,
    exception: event.code,
    stack: event.stack,
    fileName,
    lineNumber,
    functionName,
    userId: event.userId,
    role: event.role,
    schoolId: event.schoolId,
    requestBody: event.requestBody ? redact(event.requestBody) : undefined,
    headers: event.headers ? redactHeaders(event.headers) : undefined,
    executionTimeMs: ctx ? Date.now() - ctx.startedAt : undefined,
    memoryMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10,
    ...classification,
    createdAt,
  }).catch((err: Error) => {
    logger.error('Failed to persist error event to Mongo', { message: err.message });
  });
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
