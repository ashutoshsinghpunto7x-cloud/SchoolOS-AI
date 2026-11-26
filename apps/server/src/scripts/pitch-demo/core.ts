/**
 * Phase 1 — school identity, people, timetable, students, attendance, behaviour.
 */
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';

import { User } from '../../features/users/user.model';
import { Teacher } from '../../features/teachers/teacher.model';
import { Employee } from '../../features/employees/employee.model';
import { Student } from '../../features/students/student.model';
import { Attendance } from '../../features/attendance/attendance.model';
import { ClassTeacherAssignment } from '../../features/classes/class-teacher.model';
import { PeriodSlot } from '../../features/timetable/timetable.period.model';
import { Timetable, ITimetableEntry } from '../../features/timetable/timetable.model';
import { TeacherTimetable } from '../../features/teacher-timetable/teacher-timetable.model';
import { SchoolSettings } from '../../features/school-settings/school-settings.model';
import { SchoolClass } from '../../features/school-classes/school-class.model';
import { AcademicYear } from '../../features/academic-year/academic-year.model';
import { SchoolEvent } from '../../features/events/event.model';
import { BehaviorOption } from '../../features/behavior/behavior-option.model';
import { BehaviorRecord } from '../../features/behavior/behavior-record.model';
import { StudentNote } from '../../features/students/student.note.model';
import { StaffAttendanceRecord } from '../../features/staff-attendance/staff-attendance.model';

import {
  SCHOOL_ID, SCHOOL_NAME, PASSWORD, SALT_ROUNDS, ACADEMIC_YEAR, SEEDER, SUBJECTS, CLASS_SECTIONS,
  TEACHERS, STAFF, SUPPORT_STAFF, PARENTS, TeacherPlan, StaffPlan, ClassSection,
  rand, pick, randInt, gauss, clamp, phone, iso, daysAgo, utc, at, SURNAMES, BOYS, GIRLS, FATHERS, MOTHERS, log,
} from './common';

export interface UserRef { _id: string; name: string; email: string }
export interface TeacherRef extends UserRef { plan: TeacherPlan; teacherId: string; employeeObjectId: string }
export interface StaffRef extends UserRef { plan: StaffPlan; employeeObjectId: string; employeeId: string }
export interface StudentRef {
  _id: string; fullName: string; admissionNumber: string; cls: string; section: string; rollNumber: number;
  fatherName: string; motherName: string; parentPhone: string; ability: number; tuition: number;
}
export interface World {
  teachers: TeacherRef[];
  staff: Record<string, StaffRef>;
  parents: UserRef[];
  students: StudentRef[];
  slotIds: string[];
  employees: { _id: string; employeeId: string; name: string; designation: string; role: string; salary: number; userId?: string }[];
}

const TUITION: Record<string, number> = { '6': 3200, '7': 3500, '8': 3800 };

export async function seedCore(): Promise<World> {
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const world: World = { teachers: [], staff: {}, parents: [], students: [], slotIds: [], employees: [] };

  // ── School settings / classes / academic year ─────────────────────────────
  await SchoolSettings.findOneAndUpdate(
    { schoolId: SCHOOL_ID },
    {
      schoolId: SCHOOL_ID,
      schoolName: SCHOOL_NAME,
      isTestTenant: true,
      academicYearStart: utc(2026, 4, 1),
      academicYearEnd: utc(2027, 3, 31),
      attendanceRules: { startTime: '08:30', lateAfter: '08:45', halfDayAfter: '09:30', schoolEndTime: '15:30' },
      payrollConfig: { workingDaysPerMonth: 26 },
      behaviorWindow: { startTime: '08:30', endTime: '15:30' },
      reportCardBranding: {
        motto: 'Learning Today, Leading Tomorrow',
        address: '12, Civil Lines, Lucknow, Uttar Pradesh — 226001',
        phone: '0522-4001234',
        website: 'www.greenwood-demo.edu',
        email: 'office@greenwood-demo.edu',
        principalName: 'Mrs. Meera Kapoor',
      },
      communicationSettings: {
        // Everything OFF on purpose: demo phone numbers are random and must never receive a real message.
        whatsappEnabled: false, emailEnabled: false, smsEnabled: false, pushEnabled: false,
        attendanceAutoNotify: false, feeReminderAutoNotify: false,
        workingHoursStart: '08:00', workingHoursEnd: '20:00', dailyLimit: 5000, retryCount: 3,
        feeReceiptWhatsappTemplate: 'fee_payment_receipt',
      },
      updatedBy: SEEDER,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  for (const cls of ['6', '7', '8']) {
    await SchoolClass.create({ schoolId: SCHOOL_ID, name: cls, sections: cls === '8' ? ['A'] : ['A', 'B'], createdBy: SEEDER });
  }

  await AcademicYear.create({
    schoolId: SCHOOL_ID,
    label: ACADEMIC_YEAR,
    startDate: utc(2026, 4, 1),
    endDate: utc(2027, 3, 31),
    weeklyOffDays: [0],
    status: 'active',
    terms: [
      { termId: 'term-1', label: 'First Term', startDate: utc(2026, 4, 1), endDate: utc(2026, 9, 30) },
      { termId: 'term-2', label: 'Final Term', startDate: utc(2026, 10, 1), endDate: utc(2027, 3, 31) },
    ],
    specialDays: [
      { date: utc(2026, 8, 15), label: 'Independence Day', type: 'function', teachingImpact: 'full_day_off' },
      { date: utc(2026, 10, 2), label: 'Gandhi Jayanti', type: 'function', teachingImpact: 'full_day_off' },
      { date: utc(2026, 10, 20), label: 'Dussehra', type: 'function', teachingImpact: 'full_day_off' },
      { date: utc(2026, 11, 8), label: 'Diwali', type: 'function', teachingImpact: 'full_day_off' },
      { date: utc(2026, 11, 9), label: 'Diwali Break', type: 'function', teachingImpact: 'full_day_off' },
      { date: utc(2026, 12, 18), label: 'Annual Sports Day', type: 'sports_day', teachingImpact: 'full_day_off' },
      { date: utc(2026, 12, 25), label: 'Christmas', type: 'function', teachingImpact: 'full_day_off' },
      { date: utc(2027, 1, 14), label: 'Parent-Teacher Meeting', type: 'ptm', teachingImpact: 'half_day' },
      { date: utc(2027, 1, 26), label: 'Republic Day', type: 'function', teachingImpact: 'full_day_off' },
      { date: utc(2027, 2, 12), label: 'Annual Day Rehearsal', type: 'annual_day', teachingImpact: 'half_day' },
    ],
  });

  // ── Users + Employees + Teachers ──────────────────────────────────────────
  let empSeq = 1;
  const nextEmpId = (): string => `GIS-EMP-${String(empSeq++).padStart(3, '0')}`;

  async function makeEmployee(opts: {
    fullName: string; gender: 'male' | 'female'; designation: string; role: string; salary: number;
    userId?: string; teacherId?: string; email?: string; joinedYearsAgo?: number;
  }) {
    const employeeId = nextEmpId();
    const emp = await Employee.create({
      fullName: opts.fullName, gender: opts.gender, employeeId, phone: phone(), email: opts.email,
      address: 'Lucknow, Uttar Pradesh', designation: opts.designation, department: opts.role === 'teacher' ? 'Academics' : 'Administration',
      joiningDate: utc(2026 - (opts.joinedYearsAgo ?? randInt(1, 6)), randInt(1, 12), randInt(1, 25)),
      monthlySalary: opts.salary, employmentType: 'full_time', role: opts.role, teacherId: opts.teacherId, userId: opts.userId,
      status: 'active', schoolId: SCHOOL_ID, createdBy: SEEDER,
      dateOfBirth: utc(randInt(1970, 1996), randInt(1, 12), randInt(1, 27)),
    });
    world.employees.push({ _id: emp._id.toString(), employeeId, name: opts.fullName, designation: opts.designation, role: opts.role, salary: opts.salary, userId: opts.userId });
    return { emp, employeeId };
  }

  for (const plan of TEACHERS) {
    const fullName = `${plan.firstName} ${plan.lastName}`;
    const user = await User.create({
      firstName: plan.firstName, lastName: plan.lastName, email: plan.email, username: plan.username, passwordHash,
      role: 'teacher', schoolId: SCHOOL_ID, status: 'active', phone: phone(),
    });
    const employeeId = `GIS-EMP-${String(empSeq).padStart(3, '0')}`;
    const teacher = await Teacher.create({
      fullName, gender: plan.gender, employeeId, phone: phone(), email: plan.email, department: 'Academics',
      subjects: [plan.subject], assignedClasses: CLASS_SECTIONS.map((c) => `${c.cls}${c.section}`),
      employmentStatus: 'active', schoolId: SCHOOL_ID, createdBy: SEEDER,
    });
    const { emp } = await makeEmployee({
      fullName, gender: plan.gender, designation: plan.designation, role: 'teacher', salary: 8200 + plan.index * 1000,
      userId: user._id.toString(), teacherId: teacher._id.toString(), email: plan.email,
    });
    await User.updateOne({ _id: user._id }, { employeeId });
    world.teachers.push({
      _id: user._id.toString(), name: fullName, email: plan.email, plan,
      teacherId: teacher._id.toString(), employeeObjectId: emp._id.toString(),
    });
  }

  for (const s of STAFF) {
    const fullName = `${s.firstName} ${s.lastName}`;
    const user = await User.create({
      firstName: s.firstName, lastName: s.lastName, email: s.email, username: s.username, passwordHash,
      role: s.role, schoolId: SCHOOL_ID, status: 'active', phone: phone(),
    });
    const { emp, employeeId } = await makeEmployee({
      fullName, gender: s.gender, designation: s.designation, role: s.employeeRole, salary: s.salary,
      userId: user._id.toString(), email: s.email, joinedYearsAgo: s.key === 'principal' ? 9 : undefined,
    });
    await User.updateOne({ _id: user._id }, { employeeId });
    world.staff[s.key] = { _id: user._id.toString(), name: fullName, email: s.email, plan: s, employeeObjectId: emp._id.toString(), employeeId };
  }

  for (const s of SUPPORT_STAFF) {
    await makeEmployee({ fullName: s.name, gender: s.gender, designation: s.designation, role: s.role, salary: s.salary });
  }

  // ── Class-teacher assignments + timetable ─────────────────────────────────
  for (const t of TEACHERS) {
    const ref = world.teachers.find((x) => x.plan === t)!;
    await ClassTeacherAssignment.create({
      schoolId: SCHOOL_ID, class: t.classTeacherOf.cls, section: t.classTeacherOf.section,
      teacherId: ref.teacherId, teacherName: ref.name, updatedBy: SEEDER,
    });
  }

  const slotDefs = [
    { name: 'Period 1', startTime: '08:30', endTime: '09:15' },
    { name: 'Period 2', startTime: '09:15', endTime: '10:00' },
    { name: 'Period 3', startTime: '10:00', endTime: '10:45' },
    { name: 'Period 4', startTime: '11:15', endTime: '12:00' },
    { name: 'Period 5', startTime: '12:00', endTime: '12:45' },
    { name: 'Period 6', startTime: '12:45', endTime: '13:30' },
  ];
  const slots = [];
  for (const [i, s] of slotDefs.entries()) {
    slots.push(await PeriodSlot.create({
      schoolId: SCHOOL_ID, name: s.name, orderIndex: i, startTime: s.startTime, endTime: s.endTime,
      isBreak: false, daysApplicable: [1, 2, 3, 4, 5, 6], createdBy: SEEDER,
    }));
  }
  world.slotIds = slots.map((s) => s._id.toString());

  // Latin-square rotation: subject = (classIdx + slot + day) mod 5, with one
  // specialist per subject, so no teacher is ever in two rooms at once.
  const teacherBySubject = new Map(world.teachers.map((t) => [t.plan.subject, t]));
  const perTeacher = new Map<string, { dayOfWeek: number; slotId: string; subjectName: string; class: string; section: string; roomNumber: string }[]>();
  for (const [ci, cs] of CLASS_SECTIONS.entries()) {
    const entries: ITimetableEntry[] = [];
    for (let day = 1; day <= 6; day++) {
      slots.forEach((slot, si) => {
        const subject = SUBJECTS[(ci + si + day) % SUBJECTS.length];
        const t = teacherBySubject.get(subject)!;
        entries.push({ dayOfWeek: day, slotId: slot._id.toString(), subjectName: subject, teacherId: t.teacherId, teacherName: t.name } as ITimetableEntry);
        const list = perTeacher.get(t.teacherId) ?? [];
        list.push({ dayOfWeek: day, slotId: slot._id.toString(), subjectName: subject, class: cs.cls, section: cs.section, roomNumber: `Room ${cs.cls}${cs.section}` });
        perTeacher.set(t.teacherId, list);
      });
    }
    await Timetable.create({
      schoolId: SCHOOL_ID, class: cs.cls, section: cs.section, academicYear: ACADEMIC_YEAR, term: 'Full Year',
      status: 'published', entries, createdBy: SEEDER, publishedAt: new Date(), publishedBy: SEEDER,
    });
  }
  for (const t of world.teachers) {
    await TeacherTimetable.create({
      schoolId: SCHOOL_ID, teacherId: t.teacherId, teacherName: t.name, academicYear: ACADEMIC_YEAR, status: 'published',
      entries: perTeacher.get(t.teacherId) ?? [], createdBy: SEEDER, publishedAt: new Date(), publishedBy: SEEDER,
    });
  }
  log(`  timetables: ${CLASS_SECTIONS.length}, teachers: ${world.teachers.length}, staff users: ${STAFF.length}`);

  // ── Students ──────────────────────────────────────────────────────────────
  let adm = 1;
  const studentDocs: Record<string, unknown>[] = [];
  const refs: StudentRef[] = [];
  const usedNames = new Set<string>();
  for (const cs of CLASS_SECTIONS) {
    const clsNum = parseInt(cs.cls, 10);
    for (let i = 0; i < 20; i++) {
      const boy = rand() < 0.5;
      let fullName = '';
      let surname = '';
      do { surname = pick(SURNAMES); fullName = `${boy ? pick(BOYS) : pick(GIRLS)} ${surname}`; } while (usedNames.has(fullName));
      usedNames.add(fullName);
      const _id = new Types.ObjectId();
      const admissionNumber = `GIS-${2026 - (clsNum - 5)}-${String(adm).padStart(4, '0')}`;
      const fatherName = `${pick(FATHERS)} ${surname}`;
      const motherName = `${pick(MOTHERS)} ${surname}`;
      const parentPhone = phone();
      const tuition = TUITION[cs.cls];
      studentDocs.push({
        _id, fullName, admissionNumber, rollNumber: String(i + 1), class: cs.cls, section: cs.section,
        gender: boy ? 'male' : 'female', dateOfBirth: utc(2026 - (clsNum + 5), randInt(1, 12), randInt(1, 28)),
        fatherName, motherName, parentPhone, address: `${randInt(1, 220)}, ${pick(['Gomti Nagar', 'Indira Nagar', 'Aliganj', 'Mahanagar', 'Alambagh'])}, Lucknow`,
        admissionStatus: 'active', admissionYear: 2026 - (clsNum - 5), tags: [], monthlyTuitionFee: tuition,
        schoolId: SCHOOL_ID, createdBy: SEEDER,
      });
      refs.push({
        _id: _id.toString(), fullName, admissionNumber, cls: cs.cls, section: cs.section, rollNumber: i + 1,
        fatherName, motherName, parentPhone, ability: clamp(gauss(0.74, 0.13), 0.38, 0.97), tuition,
      });
      adm++;
    }
  }
  await Student.insertMany(studentDocs);
  world.students = refs;
  log(`  students: ${refs.length}`);

  // ── Parents (linked to real students) ─────────────────────────────────────
  for (const p of PARENTS) {
    const linked = p.childIdx.map((i) => refs[i]._id);
    const u = await User.create({
      firstName: p.firstName, lastName: p.lastName, email: p.email, username: p.username, passwordHash,
      role: 'parent', linkedStudentIds: linked, schoolId: SCHOOL_ID, status: 'active', phone: phone(),
    });
    // Parent phone on the child records should match the login so WhatsApp history lines up.
    world.parents.push({ _id: u._id.toString(), name: `${p.firstName} ${p.lastName}`, email: p.email });
    for (const i of p.childIdx) {
      // Child shares the parent's surname so the parent dashboard reads naturally.
      refs[i].fullName = `${refs[i].fullName.split(' ')[0]} ${p.lastName}`;
      refs[i].fatherName = `${p.firstName} ${p.lastName}`;
      refs[i].motherName = `${refs[i].motherName.split(' ')[0]} ${p.lastName}`;
      await Student.updateOne({ _id: refs[i]._id }, { fullName: refs[i].fullName, fatherName: refs[i].fatherName, motherName: refs[i].motherName });
    }
  }

  // ── Student attendance since 1 Aug (Mon–Sat) ──────────────────────────────
  const attendance: Record<string, unknown>[] = [];
  const first = utc(2026, 8, 1);
  const today = new Date();
  const classTeacherFor = (cs: ClassSection) => world.teachers.find((t) => t.plan.classTeacherOf === cs)!;
  for (let d = new Date(first); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) continue;
    const date = iso(d);
    if (['2026-08-15', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-09'].includes(date)) continue;
    for (const s of refs) {
      const cs = CLASS_SECTIONS.find((c) => c.cls === s.cls && c.section === s.section)!;
      const ct = classTeacherFor(cs);
      const absentProb = 0.04 + (1 - s.ability) * 0.12;
      const r = rand();
      const status = r < absentProb ? 'absent' : r < absentProb + 0.02 ? 'late' : 'present';
      attendance.push({
        studentId: s._id, schoolId: SCHOOL_ID, class: s.cls, section: s.section, date, status,
        markedById: ct._id, markedByName: ct.name, markedAt: at(new Date(d), 9, 5),
      });
    }
  }
  await Attendance.insertMany(attendance, { ordered: false });
  log(`  student attendance rows: ${attendance.length}`);

  // ── Staff attendance (last 45 days) ───────────────────────────────────────
  const staffRows: Record<string, unknown>[] = [];
  for (let n = 0; n < 45; n++) {
    const day = daysAgo(n);
    if (day.getDay() === 0) continue;
    for (const e of world.employees) {
      const r = rand();
      const status = r < 0.04 ? 'absent' : r < 0.1 ? 'late' : r < 0.12 ? 'half_day' : 'present';
      if (status === 'absent') { staffRows.push({ employeeId: e.employeeId, employeeObjectId: e._id, schoolId: SCHOOL_ID, date: iso(day), status }); continue; }
      const inH = status === 'late' ? 8 : 8; const inM = status === 'late' ? randInt(46, 58) : randInt(5, 29);
      const checkIn = at(day, inH, inM);
      const checkOut = at(day, status === 'half_day' ? 12 : 15, status === 'half_day' ? randInt(0, 30) : randInt(30, 59));
      staffRows.push({
        employeeId: e.employeeId, employeeObjectId: e._id, schoolId: SCHOOL_ID, date: iso(day), status,
        checkIn: { time: checkIn, recordedBy: 'Front desk scanner', device: 'Gate-1' },
        checkOut: { time: checkOut, recordedBy: 'Front desk scanner', device: 'Gate-1' },
        workingMinutes: Math.round((checkOut.getTime() - checkIn.getTime()) / 60000),
      });
    }
  }
  await StaffAttendanceRecord.insertMany(staffRows, { ordered: false });
  log(`  staff attendance rows: ${staffRows.length}`);

  // ── Behaviour options + records ───────────────────────────────────────────
  const optDefs: [string, 'positive' | 'negative' | 'neutral'][] = [
    ['Helped a classmate', 'positive'], ['Excellent participation', 'positive'], ['Leadership shown', 'positive'],
    ['Neat and organised work', 'positive'], ['Late to class', 'negative'], ['Homework not done', 'negative'],
    ['Disturbing the class', 'negative'], ['Uniform not proper', 'negative'], ['Needs encouragement', 'neutral'],
  ];
  const opts = [];
  for (const [label, category] of optDefs) {
    opts.push(await BehaviorOption.create({ schoolId: SCHOOL_ID, label, category, isDefault: true, isActive: true, createdBy: SEEDER }));
  }
  const behaviour: Record<string, unknown>[] = [];
  for (let k = 0; k < 120; k++) {
    const s = pick(refs);
    const positive = rand() < s.ability + 0.05;
    const o = positive ? pick(opts.filter((x) => x.category === 'positive')) : pick(opts.filter((x) => x.category !== 'positive'));
    const cs = CLASS_SECTIONS.find((c) => c.cls === s.cls && c.section === s.section)!;
    const ct = classTeacherFor(cs);
    const day = daysAgo(randInt(0, 40));
    behaviour.push({
      studentId: s._id, schoolId: SCHOOL_ID, class: s.cls, section: s.section, date: iso(day), optionId: o._id.toString(),
      optionLabel: o.label, category: o.category, markedById: ct._id, markedByName: ct.name, markedAt: at(day, 11),
    });
  }
  await BehaviorRecord.insertMany(behaviour);

  const noteTexts = [
    'Shows strong interest in science experiments — worth nominating for the Science Fair.',
    'Needs support with written expression in English; recommended extra reading time.',
    'Very responsible; volunteered as class monitor this month.',
    'Parent met on PTM day; agreed to monitor homework routine at home.',
    'Excellent in mental maths, often finishes early — can be given extension problems.',
  ];
  const notes = [];
  for (let k = 0; k < 15; k++) {
    const s = pick(refs);
    const cs = CLASS_SECTIONS.find((c) => c.cls === s.cls && c.section === s.section)!;
    const ct = classTeacherFor(cs);
    notes.push({ studentId: s._id, schoolId: SCHOOL_ID, type: k % 5 === 0 ? 'pinned' : 'general', content: pick(noteTexts), createdByName: ct.name, createdById: ct._id });
  }
  await StudentNote.insertMany(notes);

  // ── School calendar events ────────────────────────────────────────────────
  const ev = (title: string, eventType: string, y: number, m: number, d: number, status: string, extra: Record<string, unknown> = {}) => ({
    schoolId: SCHOOL_ID, title, eventType, status, startDate: utc(y, m, d), endDate: utc(y, m, d), isAllDay: true,
    audience: ['all'], tags: [], createdBy: SEEDER, organizer: 'Principal Office', ...extra,
  });
  await SchoolEvent.insertMany([
    ev('Half-Yearly Examinations begin', 'examination', 2026, 10, 5, 'completed', { endDate: utc(2026, 10, 14) }),
    ev('Dussehra Holiday', 'holiday', 2026, 10, 20, 'completed'),
    ev('Diwali Break', 'holiday', 2026, 11, 8, 'completed', { endDate: utc(2026, 11, 9) }),
    ev('Unit Test 3', 'examination', 2026, 11, 16, 'completed', { endDate: utc(2026, 11, 20) }),
    ev('Fee Due Date — December', 'fee_due_date', 2026, 12, 10, 'published', { audience: ['parents'] }),
    ev('Annual Sports Day', 'school_event', 2026, 12, 18, 'published', { location: 'School Ground', description: 'House-wise athletics, relay races and prize distribution.' }),
    ev('Winter Break', 'holiday', 2026, 12, 25, 'published', { endDate: utc(2027, 1, 1) }),
    ev('Parent-Teacher Meeting', 'ptm', 2027, 1, 14, 'published', { startTime: '09:00', endTime: '13:00', isAllDay: false, audience: ['parents', 'teachers'], location: 'Respective classrooms' }),
    ev('Staff Meeting — Term Review', 'staff_meeting', 2026, 12, 2, 'scheduled', { startTime: '15:45', endTime: '16:45', isAllDay: false, audience: ['teachers', 'staff'], location: 'Conference Room' }),
    ev('Open House for New Admissions', 'admission_event', 2026, 12, 5, 'published', { startTime: '10:00', endTime: '13:00', isAllDay: false, location: 'Main Auditorium' }),
    ev('Annual Day', 'school_event', 2027, 2, 20, 'scheduled', { location: 'Main Auditorium' }),
    ev('Annual Examinations begin', 'examination', 2027, 3, 1, 'scheduled', { endDate: utc(2027, 3, 12) }),
  ]);

  return world;
}
