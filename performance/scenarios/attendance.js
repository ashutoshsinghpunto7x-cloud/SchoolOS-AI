// Endpoint-focused scenario (as opposed to teacher.js's full workflow): hammers
// POST /attendance/bulk from many concurrent teacher VUs targeting a mix of
// classes, specifically to surface duplicate-write / race-condition bugs
// under concurrency (e.g. two teacher sessions marking the same class+date
// at once) — used by scripts/stress.js and scripts/spike.js.
import http from 'k6/http';
import { sleep } from 'k6';
import { env } from '../config/base.js';
import { loginCached, authHeaders } from '../helpers/auth.js';
import { randomTeacher } from '../helpers/users.js';
import { assertOk, safeJson, hasDuplicates } from '../helpers/assertions.js';
import { duplicateAttendanceRate, raceConditionRate } from '../helpers/metrics.js';
import { todayIso } from '../helpers/randomData.js';

export function attendanceStress() {
  const teacher = randomTeacher();
  const session = loginCached(teacher.email, teacher.password);
  if (!session) return;
  const opts = authHeaders(session.accessToken);
  const date = todayIso();

  // GET /attendance/class/:class/:section returns already-marked records for
  // the date, not the roster — the roster to mark against is GET /students.
  const rosterRes = http.get(
    `${env.baseUrl}/students?class=${teacher.class}&section=${teacher.section}&limit=50`,
    { ...opts, tags: { name: 'GET /students (roster)' } }
  );
  if (!assertOk(rosterRes, 'GET /students (roster)')) return;

  const body = safeJson(rosterRes);
  const roster = (body && body.data) || [];
  const students = Array.isArray(roster) ? roster.slice(0, 20) : [];
  const records = students
    .map((s) => s._id)
    .filter(Boolean)
    .map((studentId) => ({ studentId, status: Math.random() < 0.9 ? 'present' : 'absent' }));
  if (records.length === 0) return;

  const bulkRes = http.post(
    `${env.baseUrl}/attendance/bulk`,
    JSON.stringify({ class: teacher.class, section: teacher.section, date, records }),
    { ...opts, tags: { name: 'POST /attendance/bulk (stress)' } }
  );
  const ok = assertOk(bulkRes, 'POST /attendance/bulk (stress)');

  // If two VUs raced to mark the same class+date, a well-behaved API should
  // either upsert cleanly or reject the second write with a conflict — not
  // silently create a second row. Either 200/201-with-no-duplicate or a
  // documented 409 is acceptable; a 500 (already caught by assertOk) or a
  // silent duplicate is not.
  if (ok) {
    const verifyRes = http.get(
      `${env.baseUrl}/attendance/class/${teacher.class}/${teacher.section}?date=${date}`,
      { ...opts, tags: { name: 'GET /attendance/class/:class/:section (verify)' } }
    );
    const verifyBody = safeJson(verifyRes);
    const verifyList = (verifyBody && verifyBody.data && (verifyBody.data.students || verifyBody.data.records || verifyBody.data)) || [];
    if (Array.isArray(verifyList) && verifyList.length > 0) {
      const dup = hasDuplicates(verifyList, (s) => s.studentId || (s.student && s.student._id) || s._id);
      duplicateAttendanceRate.add(dup ? 1 : 0);
      raceConditionRate.add(dup ? 1 : 0);
    }
  }

  sleep(0.1);
}
