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
import { defaultRange, parseDateRange, shiftDays } from './date-range';

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
  /** Ready-made reply for a one-day attendance question; the service uses it verbatim. */
  directAnswer?: string;
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
      note?: string;
    };
    fees?: { totalOutstanding: number; pendingRecords: number };
  }[];
}

/** Which part of a student's record was actually asked for; empty = a full profile. */
function studentFocus(message: string, hasSubjectOrExam: boolean): StudentFocus[] {
  const m = message.toLowerCase();
  const focus: StudentFocus[] = [];
  if (/attend|present|absent|absence|hazir|haazir|aaya|aayi|aaye|came|late|leave|उपस्थिति|हाज़िर|हाजिर|गैरहाज़िर/.test(m)) focus.push('attendance');
  if (hasSubjectOrExam || /mark|score|result|percent|grade|rank|number|pass|fail|अंक|नंबर|परिणाम|रिज़ल्ट/.test(m)) focus.push('marks');
  if (/\bfees?\b|dues?|owe|pending|balance|outstanding|बकाया|फीस|फ़ीस/.test(m)) focus.push('fees');
  // "report" / "details" only mean "the whole record" when no specific part was named;
  // "detailed attendance report" is still just attendance.
  const isProfile = /profile|everything|all about|poori|puri|पूरी|प्रोफ़ाइल|प्रोफाइल/.test(m)
    || (!focus.length && /report|details/.test(m));
  return isProfile ? [] : focus;
}

const FOCUS_WORD: Record<StudentFocus, string> = { marks: 'marks', attendance: 'attendance', fees: 'fees' };

type LeanStudent = { _id: unknown; fullName: string; class: string; section: string; rollNumber?: string; fatherName?: string };

/** Admission / roll numbers typed in the question ("ADM-1023", "roll no 45", "FNIC/2024/045"). */
export function idCandidates(message: string): string[] {
  const out = new Set<string>();
  for (const m of message.matchAll(/[A-Za-z]{0,10}[-/]?\d[\w/-]*/g)) {
    const t = m[0].replace(/^[-/]+|[-/]+$/g, '');
    // A bare small number is almost always a class ("class 6") — keep it only when roll/admission/id is mentioned.
    if (/^\d{1,2}$/.test(t) && !/roll|admission|adm|\bid\b/i.test(message)) continue;
    if (t.length >= 1) out.add(t);
  }
  return [...out].slice(0, 4);
}

/** "Aarav" must also find "Arav": vowel runs are interchangeable, doubled consonants collapse. */
export function looseNameRegex(token: string): RegExp {
  const t = token.toLowerCase().replace(/[^\p{L}\p{M}]/gu, '');
  if (!t) return new RegExp(escapeRegex(token), 'i');
  const body = t.replace(/([aeiou]+)|([^aeiou])\2*/g, (_m, v, c) => (v ? '[aeiouyh]*' : `${escapeRegex(c)}+`));
  return new RegExp(body, 'i');
}

async function findStudents(
  ctx: AuthContext,
  message: string,
  q: { studentName: string | null; className: string | null; section: string | null },
): Promise<{ students: LeanStudent[]; relaxedClass: boolean; partial?: boolean }> {
  const base = { schoolId: ctx.schoolId, isDeleted: false };
  const run = (f: Record<string, unknown>) =>
    Student.find({ ...base, ...f }).sort({ fullName: 1 }).limit(8).select('fullName class section rollNumber fatherName').lean<LeanStudent[]>();
  const classFilter: Record<string, unknown> = {};
  if (q.className) classFilter.class = { $in: classNameVariants(q.className) };
  if (q.section) classFilter.section = q.section;
  const hasClass = Object.keys(classFilter).length > 0;

  // 1. By admission number / roll number — exact, case-insensitive.
  const ids = idCandidates(message);
  if (ids.length) {
    const exact = ids.map((i) => new RegExp(`^${escapeRegex(i)}$`, 'i'));
    const byId = await run({
      $or: [{ admissionNumber: { $in: exact } }, { rollNumber: { $in: exact } }],
      ...(hasClass && !q.studentName ? classFilter : {}),
    });
    if (byId.length) return { students: byId, relaxedClass: false };
  }
  if (!q.studentName) return { students: [], relaxedClass: false };

  const tokens = q.studentName.split(/\s+/).filter(Boolean).slice(0, 4);
  const exactAll = { $and: tokens.map((t) => ({ fullName: new RegExp(escapeRegex(t), 'i') })) };
  const looseAll = { $and: tokens.map((t) => ({ fullName: looseNameRegex(t) })) };

  // Strict name (+class) → loose spelling (+class) → same two without the class
  // (the AI-extracted class can be wrong; a name match beats "not found").
  const startsAll = { $and: tokens.map((t) => ({ fullName: new RegExp(String.raw`(^|\s)` + escapeRegex(t), 'i') })) };
  // Whole-word starts win over substrings ("Ansh Chauhan" must not also pull in "Reyansh Chauhan").
  const attempts: [Record<string, unknown>, boolean][] = [
    [startsAll, true], [exactAll, true], [looseAll, true], [startsAll, false], [exactAll, false], [looseAll, false],
  ];
  for (const [filter, withClass] of attempts) {
    if (withClass && !hasClass) continue;
    const found = await run({ ...filter, ...(withClass ? classFilter : {}) });
    if (found.length) return { students: found, relaxedClass: hasClass && !withClass };
  }
  // Any single name word (surname only, partial full name). These are only *guesses*:
  // the caller must ask "did you mean…?" rather than answer about a different child.
  if (tokens.length > 1) {
    const anchored = (t: string) => new RegExp(String.raw`(^|\s)` + looseNameRegex(t).source, 'i');
    const any = await run({ $or: tokens.filter((t) => t.replace(/[^\p{L}]/gu, '').length >= 3).map((t) => ({ fullName: anchored(t) })) });
    if (any.length) return { students: any, relaxedClass: hasClass, partial: true };
  }
  return { students: [], relaxedClass: false };
}

export async function getStudentLookup(ctx: AuthContext, message = ''): Promise<StudentLookupResult> {
  const q = await extractQueryParams(message, ctx);
  if (!q.studentName && !idCandidates(message).length) {
    return { found: false, message: "No student name was found in the question. Ask the Principal to say the student's name (or admission / roll number)." };
  }
  const focus = studentFocus(message, !!(q.subject || q.exam));

  const { students, relaxedClass, partial } = await findStudents(ctx, message, q);
  const label = q.studentName ?? idCandidates(message).join(', ');

  if (!students.length) {
    return { found: false, message: `No student matching "${label}" was found in this school's records${q.className ? ` (also tried without class ${q.className}${q.section ?? ''})` : ''}. Ask the Principal to check the spelling or give the admission number.` };
  }

  // More than one student with that name (or only a loose, partial match): don't answer
  // about a possibly-wrong child — ask which one.
  if (students.length > 1 || partial) {
    const topic = (focus.length === 1 ? ` ${FOCUS_WORD[focus[0]]}` : '') + (/\btoday\b|\baaj\b|आज/i.test(message) ? ' today' : '');
    if (partial) {
      return {
        found: true,
        clarify: {
          question: `I couldn't find a student named "${label}". Did you mean one of these?`,
          options: students.slice(0, 6).map((s) => `${s.fullName} class ${s.class}${s.section}${topic}`),
        },
      };
    }
    return {
      found: true,
      clarify: {
        question: q.className && !relaxedClass
          ? `I found ${students.length} students matching "${label}" in class ${q.className}${q.section ?? ''}. Which one do you mean?`
          : `I found ${students.length} students matching "${label}". Which one do you mean?`,
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

  // Nothing in the window? Look back a full year before saying there is no attendance.
  let attRows = attendance;
  let attRange = range;
  let attNote: string | undefined;
  const singleDay = range.from === range.to;
  if (want('attendance') && !attRows.length && !singleDay) {
    const wide = { from: shiftDays(todayISO, -365), to: todayISO, label: 'last 12 months' };
    const widened = await Attendance.find({ schoolId: ctx.schoolId, studentId: { $in: ids }, date: { $gte: wide.from, $lte: wide.to }, isDeleted: false })
      .select('studentId status date')
      .lean<{ studentId: string; status: string; date: string }[]>();
    if (widened.length) {
      attRows = widened;
      attRange = wide;
      attNote = `No attendance was recorded in ${range.label}; showing the ${wide.label} instead.`;
    }
  }

  const exams = await Exam.find({ schoolId: ctx.schoolId, _id: { $in: [...new Set(marks.map((m) => m.examId))] } })
    .select('name')
    .lean<{ _id: unknown; name: string }[]>();
  const examName = new Map(exams.map((e) => [String(e._id), e.name]));

  const subjectWanted = q.subject?.toLowerCase();
  const examWanted = q.exam?.toLowerCase();

  const matches = students.map((s) => {
    const id = String(s._id);
    const allMarks = marks
      .filter((m) => m.studentId === id)
      .map((m) => ({
        exam: examName.get(m.examId) ?? 'Exam',
        subject: m.subjectName,
        total: m.total,
        percentage: m.percentage,
        grade: m.grade,
        result: m.result,
      }));
    const norm = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '');
    const filtered = allMarks
      .filter((m) => !subjectWanted || norm(m.subject).includes(norm(subjectWanted)) || norm(subjectWanted).includes(norm(m.subject)))
      .filter((m) => !examWanted || norm(m.exam).includes(norm(examWanted)) || norm(examWanted).includes(norm(m.exam)));
    // The named subject/exam matched no wording but marks exist: hand over all of them
    // rather than "no data" — the AI picks the right subject from the list.
    const studentMarks = filtered.length || !allMarks.length ? filtered : allMarks;
    const att = attRows.filter((a) => a.studentId === id);
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
        ? {
            attendance: {
              period: attRange,
              ...computeAttendanceStats(att),
              // A one-day question ("present today?") gets the actual status of that day, not a percentage.
              ...(singleDay
                ? {
                    note: att.length
                      ? `Status on ${range.from} (${range.label}): ${att[0].status.replace('_', ' ')}.`
                      : `Attendance has not been marked for this student on ${range.from} (${range.label}) yet.`,
                  }
                : attNote ? { note: attNote } : {}),
            },
          }
        : {}),
      ...(want('fees')
        ? { fees: { totalOutstanding: feeRows.reduce((sum, f) => sum + f.balance, 0), pendingRecords: feeRows.length } }
        : {}),
    };
  });

  logger.info('[PrincipalAssistant] Student lookup', { schoolId: ctx.schoolId, matches: matches.length });

  // "Is X present today?" → one fixed sentence from the record itself.
  let directAnswer: string | undefined;
  if (singleDay && matches.length === 1 && focus.length === 1 && focus[0] === 'attendance') {
    const m = matches[0];
    const row = attRows.find((a) => a.studentId === String(students[0]._id));
    const who = `${m.name} (class ${m.class}${m.section})`;
    const isToday = range.from === todayISO;
    const day = isToday ? 'today' : `on ${range.from} (${range.label})`;
    const STATUS: Record<string, string> = { present: 'present', absent: 'absent', late: 'present (marked late)', half_day: 'present for a half day', leave_approved: 'on approved leave' };
    directAnswer = row
      ? `${who} ${isToday ? 'is' : 'was'} ${STATUS[row.status] ?? row.status} ${day}.`
      : `Attendance hasn't been marked for ${who} ${day} yet, so I can't say whether they're present.`;
  }
  return { found: true, matches, ...(directAnswer ? { directAnswer } : {}) };
}

export const peopleAssistantData = { getAbsentTeachers, getAbsentStudents, getStudentLookup };
