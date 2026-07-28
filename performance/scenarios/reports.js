// Endpoint-focused scenario: concurrent hits across every analytics category,
// simulating admin/principal dashboards left open and auto-refreshing during
// a school's peak usage window (start of day, exam result day, fee due date).
// These are typically the heaviest aggregation queries in the system, so
// they get their own dedicated load profile rather than only appearing
// inside admin.js/principal.js's lighter workflows.
import http from 'k6/http';
import { sleep } from 'k6';
import { env } from '../config/base.js';
import { loginCached, authHeaders } from '../helpers/auth.js';
import { randomFromRole } from '../helpers/users.js';
import { assertOk } from '../helpers/assertions.js';

const CATEGORIES = ['students', 'attendance', 'fees', 'admissions', 'timetable'];
const ROLE_POOL = ['admin', 'principal', 'accountant'];

export function reportsStress() {
  const role = ROLE_POOL[Math.floor(Math.random() * ROLE_POOL.length)];
  const account = randomFromRole(role);
  const session = loginCached(account.email, account.password);
  if (!session) return;
  const opts = authHeaders(session.accessToken);

  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const reportRes = http.get(
    `${env.baseUrl}/reports/analytics/${category}`,
    { ...opts, tags: { name: `GET /reports/analytics/${category}` } }
  );
  assertOk(reportRes, `GET /reports/analytics/${category}`);

  sleep(0.2);
}
