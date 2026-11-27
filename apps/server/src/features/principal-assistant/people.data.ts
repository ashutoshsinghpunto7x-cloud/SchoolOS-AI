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

export interface StudentLookupResult {
  found: boolean;
  message?: string;
  matches?: {
    name: string;
    class: string;
    section: string;
    rollNumber?: string;
    parentName?: string;
    marks: { exam: string; subject: string; total?: number; percentage?: number; grade?: string; result: string }[];
    attendance: { last30DaysPresentPercent: number | null; daysMarked: number; absentDays: number };
    fees: { totalOutstanding: number; pendingRecords: number };
  }[];
}

async function getStudentLookup(ctx: AuthContext, message = ''): Promise<StudentLookupResult> {
  const q = await extractQueryParams(message, ctx);
  if (!q.studentName) {
    return { found: false, message: 'No student name was found in the question. Ask the Principal to say the student\'s name.' };
  }

  // Every name word must appear, in any order ("Arav Sharma" / "Sharma Arav" / just "Arav").
  const tokens = q.studentName.split(/\s+/).filter(Boolean).slice(0, 4);
  const students = await Student.find({
    schoolId: ctx.schoolId,
    isDeleted: false,
    $and: tokens.map((t) => ({ fullName: new RegExp(escapeRegex(t), 'i') })),
  })
    .sort({ fullName: 1 })
    .limit(5)
    .lean<{ _id: unknown; fullName: string; class: string; section: string; rollNumber?: string; fatherName?: string }[]>();

  if (!students.length) {
    return { found: false, message: `No student matching "${q.studentName}" was found.` };
  }

  const ids = students.map((s) => String(s._id));
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [marks, attendance, fees] = await Promise.all([
    Marks.find({ schoolId: ctx.schoolId, studentId: { $in: ids }, isDeleted: false })
      .select('studentId examId subjectName total percentage grade result')
      .lean<{ studentId: string; examId: string; subjectName: string; total?: number; percentage?: number; grade?: string; result: string }[]>(),
    Attendance.find({ schoolId: ctx.schoolId, studentId: { $in: ids }, date: { $gte: since }, isDeleted: false })
      .select('studentId status')
      .lean<{ studentId: string; status: string }[]>(),
    FeeRecord.find({ schoolId: ctx.schoolId, studentId: { $in: ids }, isDeleted: false, balance: { $gt: 0 } })
      .select('studentId balance')
      .lean<{ studentId: string; balance: number }[]>(),
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
    const presentLike = att.filter((a) => ['present', 'late', 'half_day'].includes(a.status)).length;
    const feeRows = fees.filter((f) => f.studentId === id);
    return {
      name: s.fullName,
      class: s.class,
      section: s.section,
      rollNumber: s.rollNumber,
      parentName: s.fatherName,
      marks: studentMarks,
      attendance: {
        last30DaysPresentPercent: att.length ? Math.round((presentLike / att.length) * 100) : null,
        daysMarked: att.length,
        absentDays: att.filter((a) => a.status === 'absent').length,
      },
      fees: { totalOutstanding: feeRows.reduce((sum, f) => sum + f.balance, 0), pendingRecords: feeRows.length },
    };
  });

  logger.info('[PrincipalAssistant] Student lookup', { schoolId: ctx.schoolId, matches: matches.length });
  return { found: true, matches };
}

export const peopleAssistantData = { getAbsentTeachers, getAbsentStudents, getStudentLookup };
