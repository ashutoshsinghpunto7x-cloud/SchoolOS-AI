import { Student } from '../students/student.model';
import { Teacher } from '../teachers/teacher.model';
import { StaffAttendanceRecord } from '../staff-attendance/staff-attendance.model';
import { Attendance } from '../attendance/attendance.model';
import { Marks } from '../marks/marks.model';
import { Exam } from '../exams/exam.model';
import { FeeRecord } from '../fees/fee.model';
import { attendanceRepository } from '../attendance/attendance.repository';
import { principalService } from '../principal/principal.service';
import { extractQueryParams, escapeRegex } from './query-params';
import { classNameVariants } from '../../lib/class-name';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';
import { computeAttendanceStats } from './attendance-math';
import { defaultRange, parseDateRange } from './date-range';

// ── Name-level answers for the Principal assistant ───────────────────────────
// The count-only fetchers in principal-assistant.data.ts can't answer "WHO is
// absent" or "how did Arav do in Hindi". These fetchers return names/records;
// as with every other fetcher, the backend does the lookup and maths and the
// LLM only phrases the JSON it is handed.

const MAX_NAMES = 60;

// ── Absent teachers ──────────────────────────────────────────────────────────

export interface AbsentTeachersList {
  date: string;
  teachersTotal: number;
  teachersPresent: number;
  absentCount: number;
  absentTeachers: { name: string; subjects: string[]; onApprovedLeave: boolean }[];
}

async function getAbsentTeachers(ctx: AuthContext): Promise<AbsentTeachersList> {
  const date = attendanceRepository.todayString();
  const [teachers, summary] = await Promise.all([
    Teacher.find({ schoolId: ctx.schoolId, isDeleted: false })
      .select('fullName employeeId subjects')
      .lean<{ fullName: string; employeeId: string; subjects?: string[] }[]>(),
    principalService.getTeachersSummary(ctx.schoolId, date),
  ]);

  const presentRecords = await StaffAttendanceRecord.find({
    schoolId: ctx.schoolId,
    date,
    employeeId: { $in: teachers.map((t) => t.employeeId) },
    status: { $in: ['present', 'late', 'half_day'] },
  })
    .select('employeeId')
    .lean<{ employeeId: string }[]>();
  const presentIds = new Set(presentRecords.map((r) => r.employeeId));
  const leaveNames = new Set(summary.onLeave.map((l) => l.teacherName?.trim().toLowerCase()));

  // "Absent" mirrors the Daily Briefing: on the roster but not checked in today.
  const absent = teachers
    .filter((t) => !presentIds.has(t.employeeId))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((t) => ({
      name: t.fullName,
      subjects: t.subjects ?? [],
      onApprovedLeave: leaveNames.has(t.fullName.trim().toLowerCase()),
    }));

  return {
    date,
    teachersTotal: teachers.length,
    teachersPresent: teachers.length - absent.length,
    absentCount: absent.length,
    absentTeachers: absent.slice(0, MAX_NAMES),
  };
}

// ── Absent students ──────────────────────────────────────────────────────────

export interface AbsentStudentsList {
  date: string;
  classFilter: string | null;
  absentCount: number;
  absentStudents: { name: string; class: string; section: string }[];
  note?: string;
}

async function getAbsentStudents(ctx: AuthContext, message = ''): Promise<AbsentStudentsList> {
  const date = attendanceRepository.todayString();
  const p = await extractQueryParams(message, ctx);
  const cls = p.className ? { klass: p.className, section: p.section ?? undefined } : null;
  const query: Record<string, unknown> = { schoolId: ctx.schoolId, date, status: 'absent', isDeleted: false };
  if (cls) {
    query.class = { $in: classNameVariants(cls.klass) };
    if (cls.section) query.section = cls.section;
  }
  const records = await Attendance.find(query)
    .select('studentId class section')
    .lean<{ studentId: string; class: string; section: string }[]>();
  const students = records.length
    ? await Student.find({ _id: { $in: records.map((r) => r.studentId) }, schoolId: ctx.schoolId })
        .select('fullName')
        .lean<{ _id: unknown; fullName: string }[]>()
    : [];
  const nameById = new Map(students.map((s) => [String(s._id), s.fullName]));

  const list = records
    .map((r) => ({ name: nameById.get(r.studentId) ?? 'Unknown', class: r.class, section: r.section }))
    .sort((a, b) =>
      a.class.localeCompare(b.class, undefined, { numeric: true }) ||
      a.section.localeCompare(b.section) || a.name.localeCompare(b.name));

  return {
    date,
    classFilter: cls ? `${cls.klass}${cls.section ? `-${cls.section}` : ''}` : null,
    absentCount: list.length,
    absentStudents: list.slice(0, MAX_NAMES),
    note: list.length > MAX_NAMES ? `Showing the first ${MAX_NAMES} of ${list.length}; ask for a specific class to narrow it.` : undefined,
  };
}

// ── Student lookup (marks / attendance / fees for one named student) ─────────

type StudentFocus = 'marks' | 'attendance' | 'fees';

export interface StudentLookupResult {
  found: boolean;
  message?: string;
  /** Several students share the name: the service shows this question + tap-to-pick chips instead of an AI answer. */
  clarify?: { question: string; options: string[] };
  matches?: {
    name: string;
    class: string;
    section: string;
    rollNumber?: string;
    parentName?: string;
    marks?: { exam: string; subject: string; total?: number; percentage?: number; grade?: string; result: string }[];
    attendance?: {
      period: { label: string; from: string; to: string };
      markedDays: number;
      presentDays: number;
      lateDays: number;
      halfDays: number;
      approvedLeaveDays: number;
      absentDays: number;
      attendancePercent: number | null;
      /** Individual absent dates — included so "show the detailed report" is answerable from real records. */
      absentDates: string[];
    };
    fees?: { totalOutstanding: number; pendingRecords: number };
  }[];
}

/** Which part of a student's record was actually asked for; empty = a full profile. */
function studentFocus(message: string, hasSubjectOrExam: boolean): StudentFocus[] {
  const m = message.toLowerCase();
  const focus: StudentFocus[] = [];
  if (/attend|present|absent|absence|hazir|haazir|leave|उपस्थिति|हाज़िर|हाजिर|गैरहाज़िर/.test(m)) focus.push('attendance');
  if (hasSubjectOrExam || /mark|score|result|percent|grade|rank|number|pass|fail|अंक|नंबर|परिणाम|रिज़ल्ट/.test(m)) focus.push('marks');
  if (/\bfees?\b|dues?|owe|pending|balance|outstanding|बकाया|फीस|फ़ीस/.test(m)) focus.push('fees');
  // "report" / "details" only mean "the whole record" when no specific part was named;
  // "detailed attendance report" is still just attendance.
  const isProfile = /profile|everything|all about|poori|puri|पूरी|प्रोफ़ाइल|प्रोफाइल/.test(m)
    || (!focus.length && /report|details/.test(m));
  return isProfile ? [] : focus;
}

const FOCUS_WORD: Record<StudentFocus, string> = { marks: 'marks', attendance: 'attendance', fees: 'fees' };

async function getStudentLookup(ctx: AuthContext, message = ''): Promise<StudentLookupResult> {
  const q = await extractQueryParams(message, ctx);
  if (!q.studentName) {
    return { found: false, message: 'No student name was found in the question. Ask the Principal to say the student\'s name.' };
  }
  const focus = studentFocus(message, !!(q.subject || q.exam));

  // Every name word must appear, in any order ("Arav Sharma" / "Sharma Arav" / just "Arav").
  const tokens = q.studentName.split(/\s+/).filter(Boolean).slice(0, 4);
  const filter: Record<string, unknown> = {
    schoolId: ctx.schoolId,
    isDeleted: false,
    $and: tokens.map((t) => ({ fullName: new RegExp(escapeRegex(t), 'i') })),
  };
  if (q.className) filter.class = { $in: classNameVariants(q.className) };
  if (q.section) filter.section = q.section;
  const students = await Student.find(filter)
    .sort({ fullName: 1 })
    .limit(8)
    .lean<{ _id: unknown; fullName: string; class: string; section: string; rollNumber?: string; fatherName?: string }[]>();

  if (!students.length) {
    return { found: false, message: `No student matching "${q.studentName}" was found${q.className ? ` in class ${q.className}${q.section ?? ''}` : ''}.` };
  }

  // More than one student with that name: don't dump everyone's records, ask which one.
  if (students.length > 1) {
    const topic = focus.length === 1 ? ` ${FOCUS_WORD[focus[0]]}` : '';
    return {
      found: true,
      clarify: {
        question: q.className
          ? `I found ${students.length} students matching "${q.studentName}" in class ${q.className}${q.section ?? ''}. Which one do you mean?`
          : `I found ${students.length} students matching "${q.studentName}". Which one do you mean?`,
        options: students.slice(0, 6).map((s) => `${s.fullName} class ${s.class}${s.section}${topic}`),
      },
    };
  }

  const ids = students.map((s) => String(s._id));
  const todayISO = attendanceRepository.todayString();
  const range = parseDateRange(message, todayISO) ?? defaultRange(todayISO);

  const want = (f: StudentFocus) => !focus.length || focus.includes(f);
  const [marks, attendance, fees] = await Promise.all([
    want('marks')
      ? Marks.find({ schoolId: ctx.schoolId, studentId: { $in: ids }, isDeleted: false })
          .select('studentId examId subjectName total percentage grade result')
          .lean<{ studentId: string; examId: string; subjectName: string; total?: number; percentage?: number; grade?: string; result: string }[]>()
      : Promise.resolve([] as { studentId: string; examId: string; subjectName: string; total?: number; percentage?: number; grade?: string; result: string }[]),
    want('attendance')
      ? Attendance.find({ schoolId: ctx.schoolId, studentId: { $in: ids }, date: { $gte: range.from, $lte: range.to }, isDeleted: false })
          .select('studentId status date')
          .lean<{ studentId: string; status: string; date: string }[]>()
      : Promise.resolve([] as { studentId: string; status: string; date: string }[]),
    want('fees')
      ? FeeRecord.find({ schoolId: ctx.schoolId, studentId: { $in: ids }, isDeleted: false, balance: { $gt: 0 } })
          .select('studentId balance')
          .lean<{ studentId: string; balance: number }[]>()
      : Promise.resolve([] as { studentId: string; balance: number }[]),
  ]);

  const exams = await Exam.find({ schoolId: ctx.schoolId, _id: { $in: [...new Set(marks.map((m) => m.examId))] } })
    .select('name')
    .lean<{ _id: unknown; name: string }[]>();
  const examName = new Map(exams.map((e) => [String(e._id), e.name]));

  const subjectWanted = q.subject?.toLowerCase();
  const examWanted = q.exam?.toLowerCase();

  const matches = students.map((s) => {
    const id = String(s._id);
    const studentMarks = marks
      .filter((m) => m.studentId === id)
      .filter((m) => !subjectWanted || m.subjectName.toLowerCase().includes(subjectWanted))
      .map((m) => ({
        exam: examName.get(m.examId) ?? 'Exam',
        subject: m.subjectName,
        total: m.total,
        percentage: m.percentage,
        grade: m.grade,
        result: m.result,
      }))
      .filter((m) => !examWanted || m.exam.toLowerCase().includes(examWanted));
    const att = attendance.filter((a) => a.studentId === id);
    const feeRows = fees.filter((f) => f.studentId === id);
    return {
      name: s.fullName,
      class: s.class,
      section: s.section,
      rollNumber: s.rollNumber,
      // Only the sections that were asked about are included, so the reply can't wander into the rest.
      ...(!focus.length ? { parentName: s.fatherName } : {}),
      ...(want('marks') ? { marks: studentMarks } : {}),
      ...(want('attendance')
        ? { attendance: { period: range, ...computeAttendanceStats(att) } }
        : {}),
      ...(want('fees')
        ? { fees: { totalOutstanding: feeRows.reduce((sum, f) => sum + f.balance, 0), pendingRecords: feeRows.length } }
        : {}),
    };
  });

  logger.info('[PrincipalAssistant] Student lookup', { schoolId: ctx.schoolId, matches: matches.length });
  return { found: true, matches };
}

export const peopleAssistantData = { getAbsentTeachers, getAbsentStudents, getStudentLookup };
