// Rule-based root-cause classification for the Error Dashboard — no ML/AI
// call, just pattern matching on what we already have (status code, error
// code, message, stack). Confidence is a coarse heuristic, not a statistic:
// higher when multiple independent signals agree (e.g. status code AND
// message keyword both point the same way).

export type RootCauseCategory =
  | 'database'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'frontend'
  | 'network'
  | 'rate_limiting'
  | 'mongodb'
  | 'jwt'
  | 'external_api'
  | 'n8n'
  | 'memory_leak'
  | 'race_condition'
  | 'unknown';

export interface RootCauseInput {
  statusCode: number;
  code?: string;
  message: string;
  stack?: string;
  path?: string;
}

export interface RootCauseResult {
  category: RootCauseCategory;
  confidencePercent: number;
  probableCause: string;
  recommendedFix: string;
}

const FIX_RECOMMENDATIONS: Record<RootCauseCategory, string> = {
  database: 'Check the query/connection in the failing repository; verify Mongo Atlas connection pool and cluster health.',
  authentication: 'Verify credential/login flow; check for expired or malformed access tokens reaching this route.',
  authorization: 'Review the role/permission check on this route — the caller\'s role likely lacks the required permission.',
  validation: 'Tighten client-side validation to match the server schema, or relax the schema if the rule is too strict.',
  frontend: 'Likely a malformed request from the client — check the request payload shape against the expected DTO.',
  network: 'Check connectivity to the downstream dependency (timeout/DNS/TLS) and add a retry with backoff.',
  rate_limiting: 'Increase the burst/window limit for this route, or investigate the caller for abnormal request volume.',
  mongodb: 'Check for a duplicate key, invalid ObjectId, or schema/document mismatch in the failing collection.',
  jwt: 'Token is expired, malformed, or signed with a different secret — check JWT_ACCESS_EXPIRES and client refresh logic.',
  external_api: 'The third-party service (SMS/WhatsApp/AI provider) failed or timed out — check its status page and API key validity.',
  n8n: 'Check the n8n workflow webhook — the automation endpoint may be down or the payload contract changed.',
  memory_leak: 'Process memory is elevated — check for unbounded in-memory buffers/caches and restart the instance if critical.',
  race_condition: 'Two concurrent writes likely conflicted — consider a Mongo transaction or optimistic-lock version check.',
  unknown: 'No strong signal — check the stack trace and request payload manually.',
};

export function classifyError(input: RootCauseInput): RootCauseResult {
  const msg = input.message.toLowerCase();
  const code = (input.code ?? '').toLowerCase();
  const stack = (input.stack ?? '').toLowerCase();

  const match = (category: RootCauseCategory, confidencePercent: number, probableCause: string): RootCauseResult => ({
    category,
    confidencePercent,
    probableCause,
    recommendedFix: FIX_RECOMMENDATIONS[category],
  });

  if (input.statusCode === 429 || code === 'rate_limit_exceeded') {
    return match('rate_limiting', 95, 'Request blocked by the API rate limiter.');
  }
  if (input.statusCode === 401 || code === 'unauthorized') {
    if (msg.includes('token') || msg.includes('jwt')) {
      return match('jwt', 90, 'Access token missing, expired, or failed signature verification.');
    }
    return match('authentication', 80, 'Request failed authentication.');
  }
  if (input.statusCode === 403 || code === 'forbidden') {
    return match('authorization', 90, 'Authenticated user\'s role does not have the required permission.');
  }
  if (input.statusCode === 400 || code === 'validation_error') {
    return match('validation', 90, 'Request payload failed schema validation.');
  }
  if (code === 'duplicate_key' || msg.includes('e11000')) {
    return match('mongodb', 90, 'Duplicate key write — a unique index was violated.');
  }
  if (msg.includes('jsonwebtoken') || msg.includes('jwt') || stack.includes('jsonwebtoken')) {
    return match('jwt', 85, 'JWT verification/decoding failed.');
  }
  if (
    msg.includes('mongonetworkerror') ||
    msg.includes('mongoservererror') ||
    msg.includes('mongo') && (msg.includes('timeout') || msg.includes('connection')) ||
    stack.includes('mongoose') || stack.includes('mongodb')
  ) {
    return match('mongodb', 80, 'Mongo driver/query error (connection, timeout, or cast error).');
  }
  if (msg.includes('econnrefused') || msg.includes('etimedout') || msg.includes('enotfound') || msg.includes('network')) {
    return match('network', 75, 'A downstream network call failed (connection refused, DNS, or timeout).');
  }
  if (input.path?.includes('/n8n') || input.path?.includes('/automation') || msg.includes('n8n')) {
    return match('n8n', 70, 'Automation workflow (n8n) call failed or returned an error.');
  }
  if (msg.includes('openai') || msg.includes('twilio') || msg.includes('firebase') || msg.includes('render api')) {
    return match('external_api', 70, 'A third-party integration call failed.');
  }
  if (msg.includes('out of memory') || msg.includes('heap')) {
    return match('memory_leak', 65, 'Process ran out of memory or hit a heap limit.');
  }
  if (msg.includes('version') && msg.includes('conflict')) {
    return match('race_condition', 60, 'Concurrent write conflict detected.');
  }
  if (input.statusCode === 404) {
    return match('frontend', 55, 'Client requested a route/resource that does not exist.');
  }
  if (input.statusCode >= 500) {
    return match('unknown', 40, 'Unhandled server error with no matching signal — inspect the stack trace.');
  }

  return match('unknown', 30, 'No matching pattern for this error.');
}
