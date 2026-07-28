// Endpoint-focused scenario: every logged-in role polling/reading their
// notification feed, plus a mark-all-read — the highest-frequency,
// lowest-value-per-call endpoint in the system, and therefore a good
// canary for connection-pool exhaustion under high concurrency (many short
// cheap requests rather than a few expensive ones).
import http from 'k6/http';
import { sleep } from 'k6';
import { env } from '../config/base.js';
import { loginCached, authHeaders } from '../helpers/auth.js';
import { randomFromRole, randomTeacher } from '../helpers/users.js';
import { assertOk } from '../helpers/assertions.js';

const ROLE_POOL = ['teacher', 'admin', 'principal', 'reception', 'accountant'];

export function notificationsStress() {
  const role = ROLE_POOL[Math.floor(Math.random() * ROLE_POOL.length)];
  const account = role === 'teacher' ? randomTeacher() : randomFromRole(role);
  const session = loginCached(account.email, account.password);
  if (!session) return;
  const opts = authHeaders(session.accessToken);

  const listRes = http.get(`${env.baseUrl}/notifications/me`, { ...opts, tags: { name: 'GET /notifications/me' } });
  assertOk(listRes, 'GET /notifications/me');

  sleep(0.1);

  if (Math.random() < 0.3) {
    const readAllRes = http.patch(`${env.baseUrl}/notifications/read-all`, null, { ...opts, tags: { name: 'PATCH /notifications/read-all' } });
    assertOk(readAllRes, 'PATCH /notifications/read-all');
  }

  sleep(0.1);
}
