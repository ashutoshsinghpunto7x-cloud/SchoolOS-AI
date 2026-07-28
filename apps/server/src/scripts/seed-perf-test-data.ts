/**
 * Seeds a fully isolated tenant (schoolId = PERF_TEST_SCHOOL) sized for k6
 * load testing: N teacher logins (one class/section each), a reception,
 * accountant, admin and principal login, students with attendance history
 * and fee records (some left pending/overdue so the fee-payment scenario has
 * something real to pay), a few employee directory rows, and enquiries in
 * every pipeline stage.
 *
 * Isolation: mirrors seed-demo-workspace.ts — every write is scoped to
 * schoolId 'PERF_TEST_SCHOOL'. The real school's data (schoolId 'school_001')
 * is never read, queried, or touched. Re-running wipes and rebuilds only
 * PERF_TEST_SCHOOL-scoped rows, so it's safe to re-seed before every run.
 *
 * Output: writes /performance/data/perf-test-context.json — the structured
 * fixture (credentials + real Mongo IDs for students/fee records/classes)
 * that every k6 helper (helpers/users.js) reads at test start. Also writes
 * /performance/data/teachers.csv for k6's csv-based VU distribution, mirroring
 * the existing seed-teachers.ts -> performance-testing/teachers.csv pattern.
 *
 * Scale is configurable via env vars so the same script can seed a small
 * local fixture or a bigger one for a dedicated staging box:
 *   PERF_TEACHERS (default 20), PERF_STUDENTS_PER_TEACHER (default 25)
 *
 * Run: npm run seed:perf-test-data -w apps/server
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { User } from '../features/users/user.model';
import { Teacher } from '../features/teachers/teacher.model';
import { Employee } from '../features/employees/employee.model';
import { Student } from '../features/students/student.model';
import { Attendance } from '../features/attendance/attendance.model';
import { FeeRecord } from '../features/fees/fee.model';
import { Enquiry } from '../features/enquiries/enquiry.model';
import { ClassTeacherAssignment } from '../features/classes/class-teacher.model';
import { PeriodSlot } from '../features/timetable/timetable.period.model';
import { Timetable, ITimetableEntry } from '../features/timetable/timetable.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'PERF_TEST_SCHOOL';
const PASSWORD = 'PerfTest@123';
const SALT_ROUNDS = 10; // Matches auth.service.ts's current cost so a load-test run's login latency reflects production, not a stale cost.
const ACADEMIC_YEAR = '2026-27';
const ADMISSION_YEAR = new Date().getFullYear();

const TEACHER_COUNT = parseInt(process.env.PERF_TEACHERS ?? '20', 10);
const STUDENTS_PER_TEACHER = parseInt(process.env.PERF_STUDENTS_PER_TEACHER ?? '25', 10);
// Support-role counts, independently scalable — needed so a mixed-workload
// run (e.g. 20 concurrent receptionists) gets one distinct seeded account
// per virtual user instead of several VUs sharing (and racing to log into)
// the same account.
const RECEPTION_COUNT = parseInt(process.env.PERF_RECEPTION ?? '2', 10);
const ACCOUNTANT_COUNT = parseInt(process.env.PERF_ACCOUNTANT ?? '2', 10);
const ADMIN_COUNT = parseInt(process.env.PERF_ADMIN ?? '2', 10);
const PRINCIPAL_COUNT = parseInt(process.env.PERF_PRINCIPAL ?? '1', 10);

const CLASS_LEVELS = ['5', '6', '7', '8', '9', '10'];

// Section labels A, B, C, ..., Z, AA, AB, ... — sized to TEACHER_COUNT so
// every teacher gets a unique {class, section} pair. ClassTeacherAssignment
// has a unique index on {schoolId, class, section} (one class-teacher per
// class+section), so a fixed 4-section pool silently collided and aborted
// the seed with an E11000 duplicate-key error once TEACHER_COUNT exceeded
// CLASS_LEVELS.length * 4 (24) — e.g. every attempt to seed 100 teachers.
function sectionLabel(index: number): string {
  let label = '';
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}
const sectionsNeeded = Math.max(4, Math.ceil(TEACHER_COUNT / CLASS_LEVELS.length));
const SECTIONS = Array.from({ length: sectionsNeeded }, (_, i) => sectionLabel(i));

const SURNAMES = ['Yadav', 'Verma', 'Mishra', 'Tiwari', 'Singh', 'Gupta', 'Sharma', 'Pandey', 'Khan', 'Srivastava'];
const BOY_FIRST_NAMES = ['Aarav', 'Rohan', 'Aditya', 'Vivaan', 'Krishna', 'Aryan', 'Arjun', 'Kabir', 'Ansh', 'Om', 'Yash', 'Vihaan'];
const GIRL_FIRST_NAMES = ['Priya', 'Ananya', 'Kavya', 'Sanya', 'Diya', 'Ishita', 'Saanvi', 'Riya', 'Anaya', 'Khushi', 'Simran', 'Divya'];
const FATHER_FIRST_NAMES = ['Rajesh', 'Sanjay', 'Anil', 'Suresh', 'Manoj', 'Ramesh', 'Vinod', 'Dinesh', 'Ashok', 'Pradeep'];
const MOTHER_FIRST_NAMES = ['Sunita', 'Rekha', 'Kavita', 'Anita', 'Meena', 'Poonam', 'Shobha', 'Nirmala', 'Kiran', 'Geeta'];
const TEACHER_FIRST_NAMES = ['Anjali', 'Rahul', 'Priya', 'Vikram', 'Sneha', 'Amit', 'Neha', 'Rohit', 'Pooja', 'Karan'];
const SUBJECT_POOL = ['Maths', 'Science', 'English', 'Social Studies', 'Hindi', 'EVS'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(): string {
  const first = pick(['6', '7', '8', '9']);
  let rest = '';
  for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10);
  if (/^(\d)\1{8}$/.test(rest)) return randomPhone();
  return first + rest;
}

function randomDob(classLevel: number): Date {
  const baseAge = classLevel + 5;
  const year = ADMISSION_YEAR - baseAge;
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateNDaysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

interface TeacherPlan {
  index: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  classLevel: string;
  section: string;
  subjects: string[];
}

interface PerfTestContext {
  schoolId: string;
  password: string;
  seededAt: string;
  counts: Record<string, number>;
  users: {
    admin: { email: string; username: string; password: string }[];
    principal: { email: string; username: string; password: string }[];
    reception: { email: string; username: string; password: string }[];
    accountant: { email: string; username: string; password: string }[];
    teacher: { email: string; username: string; password: string; class: string; section: string }[];
  };
  classes: { class: string; section: string }[];
  students: { studentId: string; class: string; section: string }[];
  payableFeeRecords: { feeRecordId: string; studentId: string; amount: number }[];
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Seeding perf-test tenant under schoolId: ${SCHOOL_ID}`);
  console.log(`Scale: ${TEACHER_COUNT} teachers x ${STUDENTS_PER_TEACHER} students = ${TEACHER_COUNT * STUDENTS_PER_TEACHER} students`);

  // ── 1. Wipe any prior PERF_TEST_SCHOOL-scoped rows ──────────────────────────
  const [delStudents, delAttendance, delFees, delEnquiries, delAssignments, delEmployees] = await Promise.all([
    Student.deleteMany({ schoolId: SCHOOL_ID }),
    Attendance.deleteMany({ schoolId: SCHOOL_ID }),
    FeeRecord.deleteMany({ schoolId: SCHOOL_ID }),
    Enquiry.deleteMany({ schoolId: SCHOOL_ID }),
    ClassTeacherAssignment.deleteMany({ schoolId: SCHOOL_ID }),
    Employee.deleteMany({ schoolId: SCHOOL_ID }),
  ]);
  console.log('--- Cleanup (PERF_TEST_SCHOOL only) ---');
  console.log({
    delStudents: delStudents.deletedCount, delAttendance: delAttendance.deletedCount,
    delFees: delFees.deletedCount, delEnquiries: delEnquiries.deletedCount,
    delAssignments: delAssignments.deletedCount, delEmployees: delEmployees.deletedCount,
  });

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // ── 2. Build teacher roster: cycle through class/section combos ────────────
  const teacherPlans: TeacherPlan[] = [];
  for (let i = 0; i < TEACHER_COUNT; i++) {
    const classLevel = CLASS_LEVELS[i % CLASS_LEVELS.length];
    const section = SECTIONS[Math.floor(i / CLASS_LEVELS.length) % SECTIONS.length];
    const isMale = i % 2 === 0;
    teacherPlans.push({
      index: i + 1,
      email: `perfteacher${i + 1}@perf.schoolos.ai`,
      username: `perfteacher${i + 1}`,
      firstName: pick(TEACHER_FIRST_NAMES),
      lastName: pick(SURNAMES),
      gender: isMale ? 'male' : 'female',
      classLevel,
      section,
      subjects: [pick(SUBJECT_POOL), pick(SUBJECT_POOL)],
    });
  }

  const teacherProfiles: { plan: TeacherPlan; teacherId: string; teacherName: string }[] = [];
  for (const plan of teacherPlans) {
    await User.findOneAndUpdate(
      { email: plan.email },
      {
        firstName: plan.firstName, lastName: plan.lastName, email: plan.email,
        username: plan.username, passwordHash, role: 'teacher', schoolId: SCHOOL_ID, status: 'active',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    let teacherDoc = await Teacher.findOne({ email: plan.email, schoolId: SCHOOL_ID });
    const fullName = `${plan.firstName} ${plan.lastName}`;
    if (!teacherDoc) {
      teacherDoc = await Teacher.create({
        fullName, gender: plan.gender, employeeId: `PERF-EMP-${String(plan.index).padStart(4, '0')}`,
        phone: randomPhone(), email: plan.email, department: 'PerfTest', subjects: plan.subjects,
        assignedClasses: [`${plan.classLevel}${plan.section}`], employmentStatus: 'active',
        schoolId: SCHOOL_ID, createdBy: 'seed-perf-test-data script',
      });
    }
    teacherProfiles.push({ plan, teacherId: teacherDoc._id.toString(), teacherName: fullName });
  }
  console.log(`+ Teacher logins ready: ${teacherProfiles.length}`);

  // ── 3. Reception / accountant / admin / principal logins (2 each) ──────────
  const supportRoles: Array<{ role: 'reception' | 'accountant' | 'admin' | 'principal'; count: number }> = [
    { role: 'reception', count: RECEPTION_COUNT },
    { role: 'accountant', count: ACCOUNTANT_COUNT },
    { role: 'admin', count: ADMIN_COUNT },
    { role: 'principal', count: PRINCIPAL_COUNT },
  ];
  const usersByRole: Record<string, { email: string; username: string; password: string }[]> = {
    reception: [], accountant: [], admin: [], principal: [],
  };

  for (const { role, count } of supportRoles) {
    for (let i = 1; i <= count; i++) {
      const email = `perf${role}${i}@perf.schoolos.ai`;
      const username = `perf${role}${i}`;
      await User.findOneAndUpdate(
        { email },
        {
          firstName: pick(TEACHER_FIRST_NAMES), lastName: pick(SURNAMES), email, username,
          passwordHash, role, schoolId: SCHOOL_ID, status: 'active',
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      usersByRole[role].push({ email, username, password: PASSWORD });
    }
  }
  console.log(`+ Support logins ready: reception=${usersByRole.reception.length}, accountant=${usersByRole.accountant.length}, admin=${usersByRole.admin.length}, principal=${usersByRole.principal.length}`);

  // ── 4. A handful of Employee directory rows (so admin's GET /employees has data) ──
  let employeesCreated = 0;
  for (const { plan, teacherId } of teacherProfiles) {
    await Employee.create({
      fullName: `${plan.firstName} ${plan.lastName}`, gender: plan.gender,
      employeeId: `PERF-EMP-${String(plan.index).padStart(4, '0')}`, phone: randomPhone(),
      email: plan.email, designation: 'Teacher', department: 'PerfTest', role: 'teacher',
      teacherId, employmentType: 'full_time', status: 'active', schoolId: SCHOOL_ID,
      createdBy: 'seed-perf-test-data script',
    });
    employeesCreated++;
  }
  console.log(`+ Employee directory rows created: ${employeesCreated}`);

  // ── 5. Class-teacher assignments + period slots + timetables ────────────────
  for (const { plan, teacherId, teacherName } of teacherProfiles) {
    await ClassTeacherAssignment.create({
      schoolId: SCHOOL_ID, class: plan.classLevel, section: plan.section,
      teacherId, teacherName, updatedBy: 'seed-perf-test-data script',
    });
  }

  let periodSlots = await PeriodSlot.find({ schoolId: SCHOOL_ID, isDeleted: false }).sort({ orderIndex: 1 });
  if (periodSlots.length === 0) {
    const slotDefs = [
      { name: 'Period 1', startTime: '09:00', endTime: '09:40' },
      { name: 'Period 2', startTime: '09:40', endTime: '10:20' },
      { name: 'Period 3', startTime: '10:40', endTime: '11:20' },
      { name: 'Period 4', startTime: '11:20', endTime: '12:00' },
    ];
    periodSlots = await Promise.all(slotDefs.map((s, i) => PeriodSlot.create({
      schoolId: SCHOOL_ID, name: s.name, orderIndex: i, startTime: s.startTime, endTime: s.endTime,
      isBreak: false, daysApplicable: [1, 2, 3, 4, 5, 6], createdBy: 'seed-perf-test-data script',
    })));
  }

  for (const { plan, teacherId, teacherName } of teacherProfiles) {
    const entries: ITimetableEntry[] = [];
    for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
      periodSlots.forEach((slot, idx) => {
        const subjectName = plan.subjects[idx % plan.subjects.length];
        entries.push({ dayOfWeek, slotId: slot._id.toString(), subjectName, teacherId, teacherName } as ITimetableEntry);
      });
    }
    await Timetable.findOneAndUpdate(
      { schoolId: SCHOOL_ID, class: plan.classLevel, section: plan.section, isDeleted: false },
      {
        schoolId: SCHOOL_ID, class: plan.classLevel, section: plan.section, academicYear: ACADEMIC_YEAR,
        term: 'Full Year', status: 'published', entries, createdBy: 'seed-perf-test-data script',
        publishedAt: new Date(), publishedBy: 'seed-perf-test-data script',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  console.log(`+ Class-teacher assignments + timetables published: ${teacherProfiles.length}`);

  // ── 6. Students, attendance (last 7 days), fee records ──────────────────────
  let admissionSeq = 1;
  let studentsCreated = 0;
  let attendanceCreated = 0;
  let feesCreated = 0;
  const studentSamples: { studentId: string; class: string; section: string }[] = [];
  const payableFeeRecords: { feeRecordId: string; studentId: string; amount: number }[] = [];

  for (const { plan, teacherName } of teacherProfiles) {
    const classLevelNum = parseInt(plan.classLevel, 10);

    for (let i = 0; i < STUDENTS_PER_TEACHER; i++) {
      const isBoy = Math.random() < 0.5;
      const firstName = isBoy ? pick(BOY_FIRST_NAMES) : pick(GIRL_FIRST_NAMES);
      const surname = pick(SURNAMES);
      const fullName = `${firstName} ${surname}`;
      const admissionNumber = `PERF-ADM-${String(admissionSeq).padStart(5, '0')}`;

      const student = await Student.create({
        fullName, admissionNumber, rollNumber: String(i + 1), class: plan.classLevel, section: plan.section,
        gender: isBoy ? 'male' : 'female', dateOfBirth: randomDob(classLevelNum),
        fatherName: `${pick(FATHER_FIRST_NAMES)} ${surname}`, motherName: `${pick(MOTHER_FIRST_NAMES)} ${surname}`,
        parentPhone: randomPhone(), address: 'Perf Test Colony, Perf City', admissionStatus: 'active',
        admissionYear: ADMISSION_YEAR, tags: ['perf-test'], monthlyTuitionFee: 2000,
        schoolId: SCHOOL_ID, createdBy: 'seed-perf-test-data script',
      });
      studentsCreated++;
      admissionSeq++;

      const studentIdStr = student._id.toString();
      studentSamples.push({ studentId: studentIdStr, class: plan.classLevel, section: plan.section });

      // Attendance: last 7 days, ~90% present (leaves today unmarked so the
      // attendance.bulk scenario has something new to write, not just re-mark).
      for (let d = 1; d < 7; d++) {
        const date = dateNDaysAgoStr(d);
        const status = Math.random() < 0.9 ? 'present' : 'absent';
        await Attendance.create({
          studentId: studentIdStr, schoolId: SCHOOL_ID, class: plan.classLevel, section: plan.section,
          date, status, markedById: 'seed-perf-test-data script', markedByName: teacherName, markedAt: new Date(),
        });
        attendanceCreated++;
      }

      // Fee record: current-month tuition. ~50% left unpaid on purpose so the
      // fee-payment scenario has a real feeRecordId + balance to pay against.
      const roll = Math.random();
      const status = roll < 0.5 ? 'pending' : roll < 0.7 ? 'overdue' : 'paid';
      const paidAmount = status === 'paid' ? 2000 : 0;
      const dueDate = status === 'overdue'
        ? new Date(new Date().getFullYear(), new Date().getMonth() - 1, 5)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 10);

      const feeRecord = await FeeRecord.create({
        studentId: studentIdStr, studentName: fullName, admissionNumber, class: plan.classLevel,
        section: plan.section, schoolId: SCHOOL_ID, feeHead: 'tuition', description: 'Monthly Tuition Fee',
        academicYear: ACADEMIC_YEAR, month: new Date().toLocaleString('en-US', { month: 'long' }),
        totalAmount: 2000, discountAmount: 0, waivedAmount: 0, fineAmount: 0, paidAmount,
        balance: 2000 - paidAmount, dueDate, status, createdBy: 'seed-perf-test-data script',
      });
      feesCreated++;

      if (status !== 'paid') {
        payableFeeRecords.push({ feeRecordId: feeRecord._id.toString(), studentId: studentIdStr, amount: 2000 - paidAmount });
      }
    }
  }
  console.log(`+ Students created: ${studentsCreated}, attendance rows: ${attendanceCreated}, fee records: ${feesCreated} (${payableFeeRecords.length} payable)`);

  // ── 7. Admissions-pipeline enquiries ────────────────────────────────────────
  const ENQUIRY_STAGES: Array<{ stage: string; source: string }> = [
    { stage: 'new_enquiry', source: 'website' },
    { stage: 'contacted', source: 'phone' },
    { stage: 'follow_up_scheduled', source: 'walk_in' },
    { stage: 'campus_visit', source: 'referral' },
    { stage: 'application_submitted', source: 'website' },
  ];
  let enquiriesCreated = 0;
  for (const { stage, source } of ENQUIRY_STAGES) {
    const isBoy = Math.random() < 0.5;
    const firstName = isBoy ? pick(BOY_FIRST_NAMES) : pick(GIRL_FIRST_NAMES);
    const surname = pick(SURNAMES);
    await Enquiry.create({
      schoolId: SCHOOL_ID, studentName: `${firstName} ${surname}`, interestedClass: pick(CLASS_LEVELS),
      gender: isBoy ? 'male' : 'female', parentName: `${pick(FATHER_FIRST_NAMES)} ${surname}`,
      parentPhone: randomPhone(), stage, source, followUpDate: new Date(),
      stageHistory: [{ stage, changedAt: new Date(), changedBy: 'seed-perf-test-data script' }],
      tags: ['perf-test'], createdBy: 'seed-perf-test-data script',
    });
    enquiriesCreated++;
  }
  console.log(`+ Enquiries created: ${enquiriesCreated}`);

  // ── 8. Write the fixture consumed by k6 helpers ─────────────────────────────
  const classes = teacherPlans.map((p) => ({ class: p.classLevel, section: p.section }));
  const context: PerfTestContext = {
    schoolId: SCHOOL_ID,
    password: PASSWORD,
    seededAt: new Date().toISOString(),
    counts: { teachers: teacherProfiles.length, students: studentsCreated, feeRecords: feesCreated, enquiries: enquiriesCreated },
    users: {
      admin: usersByRole.admin,
      principal: usersByRole.principal,
      reception: usersByRole.reception,
      accountant: usersByRole.accountant,
      teacher: teacherProfiles.map(({ plan }) => ({ email: plan.email, username: plan.username, password: PASSWORD, class: plan.classLevel, section: plan.section })),
    },
    classes,
    // Cap the sample lists written to disk — k6 only needs a representative
    // pool per VU, not every row (100k+ students would bloat the JSON fixture).
    students: studentSamples.slice(0, 2000),
    payableFeeRecords: payableFeeRecords.slice(0, 2000),
  };

  const dataDir = path.resolve(__dirname, '../../../../performance/data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'perf-test-context.json'), JSON.stringify(context, null, 2));

  const csvLines = ['email,password', ...context.users.teacher.map((t) => `${t.email},${PASSWORD}`)];
  fs.writeFileSync(path.join(dataDir, 'teachers.csv'), csvLines.join('\n') + '\n');

  console.log(`\nFixture written: performance/data/perf-test-context.json`);
  console.log(`CSV written: performance/data/teachers.csv`);

  await mongoose.disconnect();
  console.log('\nDone. Sample login: perfadmin1@perf.schoolos.ai / ' + PASSWORD);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
