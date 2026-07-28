// Literal, step-by-step teacher workflow for the 100-teacher production-
// readiness validation (scripts/validate-100-teachers.js) — as opposed to
// teacher.js's session-reused, looping version used by smoke/load/stress/
// soak. This one is meant to run exactly once per VU (one VU = one real
// teacher's morning login), with a fresh login and an explicit logout:
//
//   Login -> Dashboard -> Teacher Workspace -> Assigned Classes
//   -> Attendance Workspace -> Select Date -> Load Student List
//   -> Mark Attendance -> Save Attendance -> Verify Saved
//   -> Student Profile -> (Navigate Back) -> Logout
//
// Two of these steps map onto endpoints already read for an earlier step
// rather than firing a new request, and are called out explicitly below:
//   - "Dashboard" and "Teacher Workspace" are the same endpoint
//     (GET /teacher-workspace/me) — this app has no separate teacher
//     dashboard route; the workspace payload IS the dashboard.
//   - "Assigned Classes" is read from that same payload's `classTeacherOf`
//     field, not a separate classes-list call — mirrors how the real
//     frontend would use one workspace fetch to drive both the dashboard
//     cards and the class picker.
//   - "Navigate Back" has no server-side effect (it's client-side routing)
//     so there is nothing to request; it's a documented no-op here, not
//     skipped silently.
import http from 'k6/http';
import { sleep, group, check } from 'k6';
import { env } from '../config/base.js';
import { login, authHeaders, logout } from '../helpers/auth.js';
import { assertOk, safeJson, hasDuplicates } from '../helpers/assertions.js';
import {
  workflowDuration,
  teacherWorkflowSuccess,
  duplicateAttendanceRate,
  partialAttendanceSaveRate,
  missingAttendanceRate,
} from '../helpers/metrics.js';
import { todayIso } from '../helpers/randomData.js';

// teacher = { email, password, class, section } — one distinct seeded
// account per VU (see scripts/validate-100-teachers.js for how VUs map to
// the fixture's teacher pool 1:1, avoiding randomTeacher()'s shared-pool
// collisions so every one of the 100 VUs exercises a different class).
//
// extraHeaders (optional) is threaded into every request this workflow
// makes — used by scripts/ops-live-test.js to attach a distinct
// X-Forwarded-For per VU so a "different teachers, different networks"
// scenario can be modeled realistically against the IP-keyed rate limiters
// in apps/server/src/middlewares/rateLimiter.ts (app.set('trust proxy', 1)
// makes the server honor this header even without a real reverse proxy in
// front of it locally).
export function teacherFullWorkflow(teacher, extraHeaders = {}) {
  const start = Date.now();
  const stepsOk = [];
  const record = (ok) => stepsOk.push(!!ok);

  // 1. Login
  const session = login(teacher.email, teacher.password, extraHeaders);
  record(!!session);
  if (!session) {
    teacherWorkflowSuccess.add(0);
    return;
  }
  const opts = authHeaders(session.accessToken, extraHeaders);

  // 2 & 3. Dashboard / Teacher Workspace (same endpoint — see file header)
  let workspace = null;
  group('teacher-full: dashboard + workspace', () => {
    const res = http.get(`${env.baseUrl}/teacher-workspace/me`, { ...opts, tags: { name: 'GET /teacher-workspace/me' } });
    const ok = assertOk(res, 'GET /teacher-workspace/me');
    record(ok);
    if (ok) workspace = safeJson(res);
  });
  sleep(0.3);

  // 4. Assigned classes (from the workspace payload, not a new request)
  let cls = teacher.class;
  let section = teacher.section;
  group('teacher-full: assigned classes', () => {
    const assignments = workspace && workspace.data && workspace.data.classTeacherOf;
    const ok = Array.isArray(assignments) && assignments.length > 0;
    record(ok);
    if (ok) {
      cls = assignments[0].class;
      section = assignments[0].section;
    }
  });

  // 5. Open attendance workspace
  group('teacher-full: attendance workspace', () => {
    const res = http.get(
      `${env.baseUrl}/attendance/class/${cls}/${section}`,
      { ...opts, tags: { name: 'GET /attendance/class/:class/:section' } }
    );
    record(assertOk(res, 'GET /attendance/class/:class/:section'));
  });
  sleep(0.2);

  // 6. Select today's date
  const date = todayIso();

  // 7. Load student list
  let roster = [];
  group('teacher-full: load student list', () => {
    const res = http.get(
      `${env.baseUrl}/students?class=${cls}&section=${section}&limit=50`,
      { ...opts, tags: { name: 'GET /students (roster)' } }
    );
    const ok = assertOk(res, 'GET /students (roster)');
    record(ok);
    if (ok) {
      const body = safeJson(res);
      roster = (body && body.data) || [];
    }
  });
  sleep(0.3);

  // 8 & 9. Mark + save attendance
  let submittedIds = [];
  let submittedByStudent = new Map();
  group('teacher-full: mark + save attendance', () => {
    const students = Array.isArray(roster) ? roster.slice(0, 20) : [];
    if (students.length === 0) {
      record(false);
      return;
    }
    const records = students
      .map((s) => s._id)
      .filter(Boolean)
      .map((studentId) => ({ studentId, status: Math.random() < 0.9 ? 'present' : 'absent' }));
    submittedIds = records.map((r) => r.studentId);
    records.forEach((r) => submittedByStudent.set(r.studentId, r.status));

    const res = http.post(
      `${env.baseUrl}/attendance/bulk`,
      JSON.stringify({ class: cls, section, date, records }),
      { ...opts, tags: { name: 'POST /attendance/bulk' } }
    );
    record(assertOk(res, 'POST /attendance/bulk', [200, 201]));
  });
  sleep(0.2);

  // 10. Verify attendance saved successfully — no duplicates, nothing
  // missing, nothing partially saved.
  group('teacher-full: verify attendance saved', () => {
    if (submittedIds.length === 0) {
      record(false);
      return;
    }
    const res = http.get(
      `${env.baseUrl}/attendance/class/${cls}/${section}?date=${date}`,
      { ...opts, tags: { name: 'GET /attendance/class/:class/:section (verify)' } }
    );
    const ok = assertOk(res, 'GET /attendance/class/:class/:section (verify)');
    record(ok);
    if (!ok) return;

    const body = safeJson(res);
    const savedList = (body && body.data) || [];
    const savedByStudent = new Map(savedList.map((r) => [r.studentId, r.status]));

    const dup = hasDuplicates(savedList, (r) => r.studentId);
    duplicateAttendanceRate.add(dup ? 1 : 0);

    const missing = submittedIds.some((id) => !savedByStudent.has(id));
    missingAttendanceRate.add(missing ? 1 : 0);

    const partial = savedList.length < submittedIds.length;
    partialAttendanceSaveRate.add(partial ? 1 : 0);

    const statusesMatch = submittedIds.every((id) => savedByStudent.get(id) === submittedByStudent.get(id));

    // eslint-disable-next-line no-console -- opt-in diagnostic, not routine output
    if (__ENV.K6_DEBUG && !statusesMatch) {
      const mismatches = submittedIds
        .filter((id) => savedByStudent.get(id) !== submittedByStudent.get(id))
        .map((id) => ({ id, submitted: submittedByStudent.get(id), saved: savedByStudent.get(id) }));
      console.log(`[K6_DEBUG] status mismatch for ${teacher.email} ${cls}/${section}: ${JSON.stringify(mismatches)}, savedCount=${savedList.length}, submittedCount=${submittedIds.length}`);
    }

    check(null, {
      'verify: no duplicate attendance rows': () => !dup,
      'verify: no missing attendance rows': () => !missing,
      'verify: no partial save': () => !partial,
      'verify: saved statuses match what was submitted': () => statusesMatch,
    });

    record(!dup && !missing && !partial && statusesMatch);
  });
  sleep(0.2);

  // 11. Open student profile
  group('teacher-full: student profile', () => {
    const studentId = submittedIds[0];
    if (!studentId) {
      record(false);
      return;
    }
    const res = http.get(`${env.baseUrl}/students/${studentId}`, { ...opts, tags: { name: 'GET /students/:id' } });
    record(assertOk(res, 'GET /students/:id'));
  });
  sleep(0.2);

  // 12. Navigate back — no server request; see file header.

  // 13. Logout
  group('teacher-full: logout', () => {
    const res = logout(session.accessToken, extraHeaders);
    record(assertOk(res, 'POST /auth/logout'));
  });

  const allOk = stepsOk.every(Boolean);
  teacherWorkflowSuccess.add(allOk ? 1 : 0);
  workflowDuration.add(Date.now() - start, { workflow: 'teacher-full' });
}
