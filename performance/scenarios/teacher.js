// Teacher workflow:
//   Login -> Dashboard (workspace) -> Timetable -> Attendance roster
//   -> Mark + save attendance -> Student profile (session reused across iterations, matching real user behavior)
import http from 'k6/http';
import { sleep, group } from 'k6';
import { env } from '../config/base.js';
import { loginCached, authHeaders } from '../helpers/auth.js';
import { randomTeacher } from '../helpers/users.js';
import { assertOk, safeJson, hasDuplicates } from '../helpers/assertions.js';
import { duplicateAttendanceRate, workflowDuration } from '../helpers/metrics.js';
import { todayIso } from '../helpers/randomData.js';

export function teacherWorkflow() {
  const start = Date.now();
  const teacher = randomTeacher();

  const session = loginCached(teacher.email, teacher.password);
  if (!session) return;
  const opts = authHeaders(session.accessToken);

  group('teacher: dashboard', () => {
    const workspaceRes = http.get(`${env.baseUrl}/teacher-workspace/me`, { ...opts, tags: { name: 'GET /teacher-workspace/me' } });
    assertOk(workspaceRes, 'GET /teacher-workspace/me');
  });
  sleep(0.3);

  group('teacher: timetable', () => {
    const timetableRes = http.get(`${env.baseUrl}/teacher-timetable/me`, { ...opts, tags: { name: 'GET /teacher-timetable/me' } });
    assertOk(timetableRes, 'GET /teacher-timetable/me');
  });
  sleep(0.3);

  const date = todayIso();
  // Note: GET /attendance/class/:class/:section returns already-marked
  // attendance *records* for the date, not the class roster — it's empty
  // before anyone has marked anything today. The actual student roster to
  // mark attendance against comes from GET /students?class=&section=.
  let roster = [];
  group('teacher: load student list', () => {
    const studentsRes = http.get(
      `${env.baseUrl}/students?class=${teacher.class}&section=${teacher.section}&limit=50`,
      { ...opts, tags: { name: 'GET /students (roster)' } }
    );
    if (assertOk(studentsRes, 'GET /students (roster)')) {
      const body = safeJson(studentsRes);
      roster = (body && body.data) || [];
    }
  });
  sleep(0.3);

  group('teacher: mark + save attendance', () => {
    const students = Array.isArray(roster) ? roster.slice(0, 20) : [];
    if (students.length === 0) return;

    const records = students
      .map((s) => s._id)
      .filter(Boolean)
      .map((studentId) => ({ studentId, status: Math.random() < 0.9 ? 'present' : 'absent' }));

    if (records.length === 0) return;

    const bulkRes = http.post(
      `${env.baseUrl}/attendance/bulk`,
      JSON.stringify({ class: teacher.class, section: teacher.section, date, records }),
      { ...opts, tags: { name: 'POST /attendance/bulk' } }
    );
    assertOk(bulkRes, 'POST /attendance/bulk');

    // Re-read the roster and confirm no student got two rows for this
    // date+class+section — a duplicate write here is a correctness bug the
    // framework spec requires this suite to catch, not just a slow request.
    const verifyRes = http.get(
      `${env.baseUrl}/attendance/class/${teacher.class}/${teacher.section}?date=${date}`,
      { ...opts, tags: { name: 'GET /attendance/class/:class/:section (verify)' } }
    );
    const verifyBody = safeJson(verifyRes);
    const verifyList = (verifyBody && verifyBody.data && (verifyBody.data.students || verifyBody.data.records || verifyBody.data)) || [];
    if (Array.isArray(verifyList) && verifyList.length > 0) {
      const dup = hasDuplicates(verifyList, (s) => s.studentId || (s.student && s.student._id) || s._id);
      duplicateAttendanceRate.add(dup ? 1 : 0);
    }
  });
  sleep(0.3);

  group('teacher: student profile', () => {
    const students = Array.isArray(roster) ? roster : [];
    const sample = students[Math.floor(Math.random() * students.length)];
    const studentId = sample && (sample.studentId || (sample.student && sample.student._id) || sample._id);
    if (!studentId) return;
    const profileRes = http.get(`${env.baseUrl}/students/${studentId}`, { ...opts, tags: { name: 'GET /students/:id' } });
    assertOk(profileRes, 'GET /students/:id');
  });
  sleep(0.2);

  workflowDuration.add(Date.now() - start, { workflow: 'teacher' });
}
