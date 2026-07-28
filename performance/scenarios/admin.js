// Admin workflow:
//   Login -> Dashboard -> Manage teachers -> Manage students -> Fee reports
//   -> Attendance reports -> Settings (session reused across iterations, matching real user behavior)
import http from 'k6/http';
import { sleep, group } from 'k6';
import { env } from '../config/base.js';
import { loginCached, authHeaders } from '../helpers/auth.js';
import { randomFromRole } from '../helpers/users.js';
import { assertOk } from '../helpers/assertions.js';
import { workflowDuration } from '../helpers/metrics.js';

export function adminWorkflow(account) {
  const start = Date.now();
  account = account || randomFromRole('admin');

  const session = loginCached(account.email, account.password);
  if (!session) return;
  const opts = authHeaders(session.accessToken);

  group('admin: manage teachers/staff', () => {
    const employeesRes = http.get(`${env.baseUrl}/employees?page=1&limit=20`, { ...opts, tags: { name: 'GET /employees' } });
    assertOk(employeesRes, 'GET /employees');
  });
  sleep(0.3);

  group('admin: manage students', () => {
    const studentsRes = http.get(`${env.baseUrl}/students?page=1&limit=20`, { ...opts, tags: { name: 'GET /students' } });
    assertOk(studentsRes, 'GET /students');
  });
  sleep(0.3);

  group('admin: fee reports', () => {
    const feeReportRes = http.get(`${env.baseUrl}/reports/analytics/fees`, { ...opts, tags: { name: 'GET /reports/analytics/fees' } });
    assertOk(feeReportRes, 'GET /reports/analytics/fees');
  });
  sleep(0.3);

  group('admin: attendance reports', () => {
    const attendanceReportRes = http.get(`${env.baseUrl}/reports/analytics/attendance`, { ...opts, tags: { name: 'GET /reports/analytics/attendance' } });
    assertOk(attendanceReportRes, 'GET /reports/analytics/attendance');
  });
  sleep(0.3);

  group('admin: settings', () => {
    const settingsRes = http.get(`${env.baseUrl}/school-settings`, { ...opts, tags: { name: 'GET /school-settings' } });
    assertOk(settingsRes, 'GET /school-settings');
  });
  sleep(0.2);

  workflowDuration.add(Date.now() - start, { workflow: 'admin' });
}
