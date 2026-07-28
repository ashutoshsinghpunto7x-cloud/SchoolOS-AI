import http from 'k6/http';
import { check } from 'k6';
import { env, httpOptions } from '../config/base.js';
import { loginTrend, authFailures } from './metrics.js';

// Logs in with an {email, password} pair from the seeded fixture (see
// helpers/users.js) and returns { accessToken, user } or null on failure.
export function login(identifier, password, extraHeaders = {}) {
  const res = http.post(
    `${env.baseUrl}/auth/login`,
    JSON.stringify({ identifier, password }),
    { headers: { 'Content-Type': 'application/json', ...extraHeaders }, tags: { name: 'POST /auth/login' }, ...httpOptions }
  );

  loginTrend.add(res.timings.duration);

  const ok = check(res, {
    'login succeeded (201)': (r) => r.status === 201,
    'login returned accessToken': (r) => {
      try {
        return !!JSON.parse(r.body).data.accessToken;
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    authFailures.add(1);
    return null;
  }

  const body = JSON.parse(res.body);
  return { accessToken: body.data.accessToken, user: body.data.user };
}

// Per-VU token cache, keyed by identifier. k6 gives each VU its own JS
// runtime instance, so a module-level Map here is naturally VU-scoped and
// persists across that VU's iterations — exactly the "log in once, reuse
// the session" behavior a real user exhibits.
//
// This is not just a realism nicety: without it, every scenario iteration
// re-logging-in against a small pool of seeded accounts (helpers/users.js)
// exhausts `authAccountLimiter` (keyed per-identifier, see
// apps/server/src/middlewares/rateLimiter.ts) almost immediately once VU
// count climbs — a real load run hit exactly this (676k/684k requests were
// 429s on /auth/login, not a backend capacity problem) before this cache
// was added. Cache lifetime is set comfortably under the access token's
// 15-minute expiry (apps/server/src/config/env.ts's JWT_ACCESS_EXPIRES).
const tokenCache = new Map();
const TOKEN_CACHE_TTL_MS = 13 * 60 * 1000;

export function loginCached(identifier, password, extraHeaders = {}) {
  const cached = tokenCache.get(identifier);
  if (cached && Date.now() < cached.expiresAt) return cached;

  const session = login(identifier, password, extraHeaders);
  if (session) {
    tokenCache.set(identifier, { ...session, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
  }
  return session;
}

export function authHeaders(accessToken, extraHeaders = {}) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...extraHeaders,
    },
    ...httpOptions,
  };
}

export function logout(accessToken, extraHeaders = {}) {
  return http.post(`${env.baseUrl}/auth/logout`, null, {
    ...authHeaders(accessToken, extraHeaders),
    tags: { name: 'POST /auth/logout' },
  });
}
