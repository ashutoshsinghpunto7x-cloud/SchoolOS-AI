/**
 * Seeds a fully self-contained demo workspace: 5 teacher logins + 1 principal
 * login + 1 reception login, each teacher owning a class/section of 20 fake
 * students, with attendance, fee, and admissions-pipeline data so every
 * dashboard widget has something real to render.
 *
 * Isolation: everything here is scoped to schoolId = 'DEMO_SCHOOL'. Every
 * collection in this app (User, Student, Teacher, Attendance, FeeRecord,
 * Enquiry, ClassTeacherAssignment, ...) is already partitioned by schoolId —
 * confirmed via principal.service.ts / *.repository.ts, which take schoolId
 * as the first argument to every query. The real school's data lives under
 * schoolId 'school_001' (see reset-and-seed-students.ts) and is never
 * touched, queried, or deleted by this script.
 *
 * Idempotent: re-running wipes and rebuilds only DEMO_SCHOOL-scoped rows.
 *
 * Run: npm run seed:demo-workspace -w apps/server
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

import { User } from '../features/users/user.model';
import { Teacher } from '../features/teachers/teacher.model';
import { Student } from '../features/students/student.model';
import { Attendance } from '../features/attendance/attendance.model';
import { FeeRecord } from '../features/fees/fee.model';
import { Enquiry } from '../features/enquiries/enquiry.model';
import { ClassTeacherAssignment } from '../features/classes/class-teacher.model';
import { PeriodSlot } from '../features/timetable/timetable.period.model';
import { Timetable, ITimetableEntry } from '../features/timetable/timetable.model';
import { Vehicle, VehicleLocation, StudentTransportAssignment } from '../features/transport/transport.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'DEMO_SCHOOL';
const PASSWORD = 'Demo@123';
const SALT_ROUNDS = 12; // Matches auth.service.ts so bcrypt.compare() succeeds at login.
const ACADEMIC_YEAR = '2026-27';
const ADMISSION_YEAR = new Date().getFullYear();
const STUDENTS_PER_TEACHER = 20;

// ── Demo teacher roster: 1 class/section each ──────────────────────────────

interface DemoTeacherPlan {
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

const DEMO_TEACHERS: DemoTeacherPlan[] = [
  { index: 1, email: 'demoteacher1@demo.schoolos.ai', username: 'demoteacher1', firstName: 'Anjali', lastName: 'Sharma', gender: 'female', classLevel: '6', section: 'A', subjects: ['Maths', 'Science'] },
  { index: 2, email: 'demoteacher2@demo.schoolos.ai', username: 'demoteacher2', firstName: 'Rahul', lastName: 'Verma', gender: 'male', classLevel: '6', section: 'B', subjects: ['English', 'Social Studies'] },
  { index: 3, email: 'demoteacher3@demo.schoolos.ai', username: 'demoteacher3', firstName: 'Priya', lastName: 'Nair', gender: 'female', classLevel: '7', section: 'A', subjects: ['Hindi', 'EVS'] },
  { index: 4, email: 'demoteacher4@demo.schoolos.ai', username: 'demoteacher4', firstName: 'Vikram', lastName: 'Rao', gender: 'male', classLevel: '7', section: 'B', subjects: ['Science', 'Maths'] },
  { index: 5, email: 'demoteacher5@demo.schoolos.ai', username: 'demoteacher5', firstName: 'Sneha', lastName: 'Iyer', gender: 'female', classLevel: '8', section: 'A', subjects: ['English', 'Hindi'] },
];

const DEMO_PRINCIPAL = {
  email: 'demoprincipal@demo.schoolos.ai',
  username: 'demoprincipal',
  firstName: 'Meera',
  lastName: 'Kapoor',
};

const DEMO_RECEPTION = {
  email: 'demoreception@demo.schoolos.ai',
  username: 'demoreception',
  firstName: 'Kavita',
  lastName: 'Rao',
};

const DEMO_PARENT = {
  email: 'demoparent@demo.schoolos.ai',
  username: 'demoparent',
  firstName: 'Ekansh',
  lastName: 'Sharma',
};

const DEMO_DRIVER = {
  email: 'demodriver@demo.schoolos.ai',
  username: 'demodriver',
  firstName: 'Suresh',
  lastName: 'Kumar',
};

// Roughly central Delhi — arbitrary but plausible so the map pin lands somewhere real.
const DEMO_VEHICLE_START = { latitude: 28.6139, longitude: 77.209 };

// ── Name pools (kept small and clearly fictional) ──────────────────────────

const SURNAMES = ['Yadav', 'Verma', 'Mishra', 'Tiwari', 'Singh', 'Gupta', 'Sharma', 'Pandey', 'Khan', 'Srivastava'];
const BOY_FIRST_NAMES = ['Aarav', 'Rohan', 'Aditya', 'Vivaan', 'Krishna', 'Aryan', 'Arjun', 'Kabir', 'Ansh', 'Om', 'Yash', 'Vihaan'];
const GIRL_FIRST_NAMES = ['Priya', 'Ananya', 'Kavya', 'Sanya', 'Diya', 'Ishita', 'Saanvi', 'Riya', 'Anaya', 'Khushi', 'Simran', 'Divya'];
const FATHER_FIRST_NAMES = ['Rajesh', 'Sanjay', 'Anil', 'Suresh', 'Manoj', 'Ramesh', 'Vinod', 'Dinesh', 'Ashok', 'Pradeep'];
const MOTHER_FIRST_NAMES = ['Sunita', 'Rekha', 'Kavita', 'Anita', 'Meena', 'Poonam', 'Shobha', 'Nirmala', 'Kiran', 'Geeta'];

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

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Seeding isolated demo workspace under schoolId: ${SCHOOL_ID}`);

  // ── 1. Wipe any prior DEMO_SCHOOL-scoped rows (never touches school_001) ──
  const [delStudents, delAttendance, delFees, delEnquiries, delAssignments] = await Promise.all([
    Student.deleteMany({ schoolId: SCHOOL_ID }),
    Attendance.deleteMany({ schoolId: SCHOOL_ID }),
    FeeRecord.deleteMany({ schoolId: SCHOOL_ID }),
    Enquiry.deleteMany({ schoolId: SCHOOL_ID }),
    ClassTeacherAssignment.deleteMany({ schoolId: SCHOOL_ID }),
  ]);
  console.log('\n--- Cleanup (DEMO_SCHOOL only) ---');
  console.log({ delStudents: delStudents.deletedCount, delAttendance: delAttendance.deletedCount, delFees: delFees.deletedCount, delEnquiries: delEnquiries.deletedCount, delAssignments: delAssignments.deletedCount });

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // ── 2. Teacher User logins + Teacher profiles ──────────────────────────────
  const teacherProfiles: { plan: DemoTeacherPlan; teacherId: string; teacherName: string }[] = [];

  for (const plan of DEMO_TEACHERS) {
    await User.findOneAndUpdate(
      { email: plan.email },
      {
        firstName: plan.firstName,
        lastName: plan.lastName,
        email: plan.email,
        username: plan.username,
        passwordHash,
        role: 'teacher',
        schoolId: SCHOOL_ID,
        status: 'active',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    let teacherDoc = await Teacher.findOne({ email: plan.email, schoolId: SCHOOL_ID });
    const fullName = `${plan.firstName} ${plan.lastName}`;
    if (!teacherDoc) {
      teacherDoc = await Teacher.create({
        fullName,
        gender: plan.gender,
        employeeId: `DEMO-EMP-${String(plan.index).padStart(3, '0')}`,
        phone: randomPhone(),
        email: plan.email,
        department: 'Demo',
        subjects: plan.subjects,
        assignedClasses: [`${plan.classLevel}${plan.section}`],
        employmentStatus: 'active',
        schoolId: SCHOOL_ID,
        createdBy: 'seed-demo-workspace script',
      });
    }

    teacherProfiles.push({ plan, teacherId: teacherDoc._id.toString(), teacherName: fullName });
    console.log(`+ Teacher login ready: ${plan.email} / ${PASSWORD} (class ${plan.classLevel}${plan.section})`);
  }

  // ── 3. Principal User login (no Teacher profile) ───────────────────────────
  await User.findOneAndUpdate(
    { email: DEMO_PRINCIPAL.email },
    {
      firstName: DEMO_PRINCIPAL.firstName,
      lastName: DEMO_PRINCIPAL.lastName,
      email: DEMO_PRINCIPAL.email,
      username: DEMO_PRINCIPAL.username,
      passwordHash,
      role: 'principal',
      schoolId: SCHOOL_ID,
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`+ Principal login ready: ${DEMO_PRINCIPAL.email} / ${PASSWORD}`);

  // ── 3b. Reception User login (front desk — no Teacher profile) ─────────────
  await User.findOneAndUpdate(
    { email: DEMO_RECEPTION.email },
    {
      firstName: DEMO_RECEPTION.firstName,
      lastName: DEMO_RECEPTION.lastName,
      email: DEMO_RECEPTION.email,
      username: DEMO_RECEPTION.username,
      passwordHash,
      role: 'reception',
      schoolId: SCHOOL_ID,
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`+ Reception login ready: ${DEMO_RECEPTION.email} / ${PASSWORD}`);

  // ── 4. Class-teacher assignments ────────────────────────────────────────────
  for (const { plan, teacherId, teacherName } of teacherProfiles) {
    await ClassTeacherAssignment.create({
      schoolId: SCHOOL_ID,
      class: plan.classLevel,
      section: plan.section,
      teacherId,
      teacherName,
      updatedBy: 'seed-demo-workspace script',
    });
  }
  console.log(`+ Class-teacher assignments created: ${teacherProfiles.length}`);

  // ── 4b. Period slots + timetable ─────────────────────────────────────────
  // Without this, useTeacherWorkspace() (which drives both the Marks hub and
  // the new Report Cards hub) finds no "subjects taught" for these accounts —
  // it reads the timetable, not ClassTeacherAssignment/Teacher.assignedClasses.
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
      isBreak: false, daysApplicable: [1, 2, 3, 4, 5, 6], createdBy: 'seed-demo-workspace script',
    })));
    console.log(`+ Period slots created: ${periodSlots.length}`);
  }

  let timetablesCreated = 0;
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
        term: 'Full Year', status: 'published', entries, createdBy: 'seed-demo-workspace script',
        publishedAt: new Date(), publishedBy: 'seed-demo-workspace script',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    timetablesCreated++;
  }
  console.log(`+ Timetables published: ${timetablesCreated}`);

  // ── 5. Students, attendance (last 7 days), fee records ──────────────────────
  let admissionSeq = 1;
  let studentsCreated = 0;
  let attendanceCreated = 0;
  let feesCreated = 0;
  // The demo parent account gets linked to one student from each of the
  // first two classes, so the Parent Workspace's child-switcher has two
  // real children to switch between (mirrors the mocked Aarav/Anaya pair
  // the frontend currently ships with).
  const demoParentLinkedStudentIds: string[] = [];

  for (const [classIndex, { plan, teacherName }] of teacherProfiles.entries()) {
    const classLevelNum = parseInt(plan.classLevel, 10);
    const isParentLinkClass = classIndex < 2;

    for (let i = 0; i < STUDENTS_PER_TEACHER; i++) {
      const isBoy = Math.random() < 0.5;
      const firstName = isBoy ? pick(BOY_FIRST_NAMES) : pick(GIRL_FIRST_NAMES);
      const surname = pick(SURNAMES);
      const fullName = `${firstName} ${surname}`;
      const admissionNumber = `DEMO-ADM-${String(admissionSeq).padStart(4, '0')}`;

      const student = await Student.create({
        fullName,
        admissionNumber,
        rollNumber: String(i + 1),
        class: plan.classLevel,
        section: plan.section,
        gender: isBoy ? 'male' : 'female',
        dateOfBirth: randomDob(classLevelNum),
        fatherName: `${pick(FATHER_FIRST_NAMES)} ${surname}`,
        motherName: `${pick(MOTHER_FIRST_NAMES)} ${surname}`,
        parentPhone: randomPhone(),
        address: 'Demo Colony, Demo City',
        admissionStatus: 'active',
        admissionYear: ADMISSION_YEAR,
        tags: ['demo'],
        monthlyTuitionFee: 2000,
        schoolId: SCHOOL_ID,
        createdBy: 'seed-demo-workspace script',
      });
      studentsCreated++;
      admissionSeq++;

      if (isParentLinkClass && i === 0) {
        demoParentLinkedStudentIds.push(student._id.toString());
      }

      // Attendance: last 7 days, ~90% present.
      for (let d = 0; d < 7; d++) {
        const date = dateNDaysAgoStr(d);
        const status = Math.random() < 0.9 ? 'present' : 'absent';
        await Attendance.create({
          studentId: student._id.toString(),
          schoolId: SCHOOL_ID,
          class: plan.classLevel,
          section: plan.section,
          date,
          status,
          markedById: 'seed-demo-workspace script',
          markedByName: teacherName,
          markedAt: new Date(),
        });
        attendanceCreated++;
      }

      // Fee record: current-month tuition, mostly paid, a few overdue/pending for realism.
      const roll = Math.random();
      const status = roll < 0.6 ? 'paid' : roll < 0.85 ? 'pending' : 'overdue';
      const paidAmount = status === 'paid' ? 2000 : status === 'pending' ? 0 : 0;
      const dueDate = status === 'overdue'
        ? new Date(new Date().getFullYear(), new Date().getMonth() - 1, 5)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 10);

      await FeeRecord.create({
        studentId: student._id.toString(),
        studentName: fullName,
        admissionNumber,
        class: plan.classLevel,
        section: plan.section,
        schoolId: SCHOOL_ID,
        feeHead: 'tuition',
        description: 'Monthly Tuition Fee',
        academicYear: ACADEMIC_YEAR,
        month: new Date().toLocaleString('en-US', { month: 'long' }),
        totalAmount: 2000,
        discountAmount: 0,
        waivedAmount: 0,
        fineAmount: 0,
        paidAmount,
        balance: 2000 - paidAmount,
        dueDate,
        status,
        createdBy: 'seed-demo-workspace script',
      });
      feesCreated++;
    }
  }

  console.log(`\n--- Seed summary ---`);
  console.log(`Students created: ${studentsCreated}`);
  console.log(`Attendance records created: ${attendanceCreated}`);
  console.log(`Fee records created: ${feesCreated}`);

  // ── 5b. Parent User login, linked to two real students ─────────────────────
  await User.findOneAndUpdate(
    { email: DEMO_PARENT.email },
    {
      firstName: DEMO_PARENT.firstName,
      lastName: DEMO_PARENT.lastName,
      email: DEMO_PARENT.email,
      username: DEMO_PARENT.username,
      passwordHash,
      role: 'parent',
      linkedStudentIds: demoParentLinkedStudentIds,
      schoolId: SCHOOL_ID,
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`+ Parent login ready: ${DEMO_PARENT.email} / ${PASSWORD} (linked to ${demoParentLinkedStudentIds.length} students)`);

  // ── 5c. Driver User login + Vehicle, assigned to the parent's first child ──
  const driverUser = await User.findOneAndUpdate(
    { email: DEMO_DRIVER.email },
    {
      firstName: DEMO_DRIVER.firstName,
      lastName: DEMO_DRIVER.lastName,
      email: DEMO_DRIVER.email,
      username: DEMO_DRIVER.username,
      passwordHash,
      role: 'driver',
      schoolId: SCHOOL_ID,
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`+ Driver login ready: ${DEMO_DRIVER.email} / ${PASSWORD}`);

  await Vehicle.deleteMany({ schoolId: SCHOOL_ID });
  const driverName = `${DEMO_DRIVER.firstName} ${DEMO_DRIVER.lastName}`;
  const vehicle = await Vehicle.create({
    schoolId: SCHOOL_ID,
    vehicleNumber: 'DL-1PC-4041',
    routeName: 'Route 1 — Demo Colony',
    driverUserId: driverUser._id.toString(),
    driverName,
    status: 'active',
  });

  await StudentTransportAssignment.deleteMany({ schoolId: SCHOOL_ID });
  if (demoParentLinkedStudentIds[0]) {
    await StudentTransportAssignment.create({
      schoolId: SCHOOL_ID,
      studentId: demoParentLinkedStudentIds[0],
      vehicleId: vehicle._id.toString(),
    });
  }

  // Seed a "route active" fix so the parent dashboard shows a live pin
  // immediately, without needing the driver to actually open the app first.
  await VehicleLocation.findOneAndUpdate(
    { vehicleId: vehicle._id.toString() },
    {
      schoolId: SCHOOL_ID,
      vehicleId: vehicle._id.toString(),
      latitude: DEMO_VEHICLE_START.latitude,
      longitude: DEMO_VEHICLE_START.longitude,
      routeStatus: 'active',
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
  console.log(`+ Vehicle ready: ${vehicle.vehicleNumber} (${vehicle.routeName}), driver assigned, 1 student assigned, live fix seeded`);

  // ── 6. A handful of admissions-pipeline enquiries ──────────────────────────
  const ENQUIRY_STAGES: Array<{ stage: string; source: string }> = [
    { stage: 'new_enquiry', source: 'website' },
    { stage: 'contacted', source: 'phone' },
    { stage: 'follow_up_scheduled', source: 'walk_in' },
    { stage: 'campus_visit', source: 'referral' },
    { stage: 'application_submitted', source: 'website' },
    { stage: 'converted', source: 'walk_in' },
  ];

  for (let i = 0; i < ENQUIRY_STAGES.length; i++) {
    const { stage, source } = ENQUIRY_STAGES[i];
    const isBoy = Math.random() < 0.5;
    const firstName = isBoy ? pick(BOY_FIRST_NAMES) : pick(GIRL_FIRST_NAMES);
    const surname = pick(SURNAMES);

    await Enquiry.create({
      schoolId: SCHOOL_ID,
      studentName: `${firstName} ${surname}`,
      interestedClass: pick(['6', '7', '8']),
      gender: isBoy ? 'male' : 'female',
      parentName: `${pick(FATHER_FIRST_NAMES)} ${surname}`,
      parentPhone: randomPhone(),
      stage,
      source,
      followUpDate: stage !== 'converted' && stage !== 'lost' ? new Date() : undefined,
      stageHistory: [{ stage, changedAt: new Date(), changedBy: 'seed-demo-workspace script' }],
      conversionData: stage === 'converted'
        ? { studentId: 'demo-converted-placeholder', convertedAt: new Date(), convertedBy: 'seed-demo-workspace script' }
        : undefined,
      tags: ['demo'],
      createdBy: 'seed-demo-workspace script',
    });
  }
  console.log(`Enquiries created: ${ENQUIRY_STAGES.length}`);

  // ── 7. Sanity read-back ─────────────────────────────────────────────────────
  const demoStudentCount = await Student.countDocuments({ schoolId: SCHOOL_ID });
  const realStudentCount = await Student.countDocuments({ schoolId: 'school_001' });
  console.log('\n--- Sanity read-back ---');
  console.log(`Student.countDocuments({schoolId:'DEMO_SCHOOL'}) = ${demoStudentCount}`);
  console.log(`Student.countDocuments({schoolId:'school_001'}) (untouched, for comparison) = ${realStudentCount}`);

  console.log('\n=== Demo login credentials ===');
  for (const plan of DEMO_TEACHERS) {
    console.log(`  ${plan.email}  (or username "${plan.username}")  /  ${PASSWORD}   — class ${plan.classLevel}${plan.section}, ${STUDENTS_PER_TEACHER} students`);
  }
  console.log(`  ${DEMO_PRINCIPAL.email}  (or username "${DEMO_PRINCIPAL.username}")  /  ${PASSWORD}   — principal dashboard`);
  console.log(`  ${DEMO_RECEPTION.email}  (or username "${DEMO_RECEPTION.username}")  /  ${PASSWORD}   — reception dashboard`);
  console.log(`  ${DEMO_PARENT.email}  (or username "${DEMO_PARENT.username}")  /  ${PASSWORD}   — parent dashboard`);
  console.log(`  ${DEMO_DRIVER.email}  (or username "${DEMO_DRIVER.username}")  /  ${PASSWORD}   — driver dashboard (vehicle DL-1PC-4041)`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
