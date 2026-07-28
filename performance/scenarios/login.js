// Pure auth-path scenario: login -> /auth/me -> logout, across a random mix
// of every seeded role. Used standalone by scripts/smoke.js as the first,
// cheapest signal that auth (and therefore every other scenario, which all
// depend on login) is healthy before running anything heavier.
import { sleep } from 'k6';
import { env } from '../config/base.js';
import { login, logout, authHeaders } from '../helpers/auth.js';
import { randomFromRole, randomTeacher } from '../helpers/users.js';
import { assertOk } from '../helpers/assertions.js';
import http from 'k6/http';

const ROLE_WEIGHTS = ['teacher', 'teacher', 'teacher', 'admin', 'principal', 'reception', 'accountant'];

export function loginWorkflow() {
  const role = ROLE_WEIGHTS[Math.floor(Math.random() * ROLE_WEIGHTS.length)];
  const account = role === 'teacher' ? randomTeacher() : randomFromRole(role);

  const session = login(account.email, account.password);
  if (!session) return;

  sleep(0.2);

  const meRes = http.get(`${env.baseUrl}/auth/me`, { ...authHeaders(session.accessToken), tags: { name: 'GET /auth/me' } });
  assertOk(meRes, 'GET /auth/me');

  sleep(0.2);
  logout(session.accessToken);
}
