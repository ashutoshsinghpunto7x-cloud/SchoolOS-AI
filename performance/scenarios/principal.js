// Principal workflow:
//   Login -> Dashboard -> Attendance analytics -> Fee analytics -> Reports
//   -> Search (session reused across iterations, matching real user behavior)
import http from 'k6/http';
import { sleep, group } from 'k6';
import { env } from '../config/base.js';
import { loginCached, authHeaders } from '../helpers/auth.js';
import { randomFromRole } from '../helpers/users.js';
import { assertOk } from '../helpers/assertions.js';
import { workflowDuration } from '../helpers/metrics.js';

export function principalWorkflow(account) {
  const start = Date.now();
  account = account || randomFromRole('principal');

  const session = loginCached(account.email, account.password);
  if (!session) return;
  const opts = authHeaders(session.accessToken);

  group('principal: dashboard', () => {
    const dashboardRes = http.get(`${env.baseUrl}/principal/dashboard`, { ...opts, tags: { name: 'GET /principal/dashboard' } });
    assertOk(dashboardRes, 'GET /principal/dashboard');
  });
  sleep(0.3);

  group('principal: attendance analytics', () => {
    const attendanceRes = http.get(`${env.baseUrl}/reports/analytics/attendance`, { ...opts, tags: { name: 'GET /reports/analytics/attendance' } });
    assertOk(attendanceRes, 'GET /reports/analytics/attendance');
  });
  sleep(0.3);

  group('principal: fee analytics', () => {
    const feeRes = http.get(`${env.baseUrl}/reports/analytics/fees`, { ...opts, tags: { name: 'GET /reports/analytics/fees' } });
    assertOk(feeRes, 'GET /reports/analytics/fees');
  });
  sleep(0.3);

  group('principal: teachers summary report', () => {
    const summaryRes = http.get(`${env.baseUrl}/principal/teachers-summary`, { ...opts, tags: { name: 'GET /principal/teachers-summary' } });
    assertOk(summaryRes, 'GET /principal/teachers-summary');
  });
  sleep(0.3);

  group('principal: search', () => {
    const searchRes = http.get(`${env.baseUrl}/students/search?q=A`, { ...opts, tags: { name: 'GET /students/search' } });
    assertOk(searchRes, 'GET /students/search');
  });
  sleep(0.2);

  workflowDuration.add(Date.now() - start, { workflow: 'principal' });
}
