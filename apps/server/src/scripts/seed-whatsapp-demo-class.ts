/**
 * Adds ONE dedicated demo teacher + class to the existing DEMO_SCHOOL sandbox
 * (schoolId 'DEMO_SCHOOL', same isolation as seed-demo-workspace.ts — never
 * touches school_001), containing a small, hand-picked set of "dummy"
 * students whose parentPhone is a REAL WhatsApp number supplied by the
 * school, for testing the attendance -> "Send WhatsApp Reminder" flow
 * end-to-end without any chance of messaging a real student's parent.
 *
 * Additive/idempotent: upserts by email (User/Teacher), by
 * {schoolId,class,section} (ClassTeacherAssignment/Timetable), and by
 * admissionNumber (Student) — never wipes the rest of DEMO_SCHOOL.
 *
 * Run: npm run seed:whatsapp-demo -w apps/server
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

import { User } from '../features/users/user.model';
import { Teacher } from '../features/teachers/teacher.model';
import { Student } from '../features/students/student.model';
import { ClassTeacherAssignment } from '../features/classes/class-teacher.model';
import { PeriodSlot } from '../features/timetable/timetable.period.model';
import { Timetable, ITimetableEntry } from '../features/timetable/timetable.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'DEMO_SCHOOL';
const PASSWORD = 'Demo@123';
const SALT_ROUNDS = 12; // Matches auth.service.ts so bcrypt.compare() succeeds at login.
const ACADEMIC_YEAR = '2026-27';
const ADMISSION_YEAR = new Date().getFullYear();

const CLASS_LEVEL = '9';
const SECTION = 'W'; // "W" for WhatsApp demo — distinct from seed-demo-workspace.ts's 6A/6B/7A/7B/8A.

const DEMO_TEACHER = {
  email: 'demoteacher.whatsapp@demo.schoolos.ai',
  username: 'demoteacher-whatsapp',
  firstName: 'Reminder',
  lastName: 'Demo Teacher',
  gender: 'female' as const,
  subjects: ['General'],
};

// Real WhatsApp numbers supplied by the school for this test — 10-digit
// bare Indian numbers, matching the Student model's parentPhone format
// (toMetaPhoneFormat() in whatsapp-cloud.provider.ts prefixes '91' at send time).
const DUMMY_STUDENTS = [
  { fullName: 'Ashutosh Singh', parentPhone: '9219583594' },
  { fullName: 'Ekansh', parentPhone: '6386639197' },
  { fullName: 'Mradul', parentPhone: '9696758321' },
  { fullName: 'Mohit', parentPhone: '7292942981' },
  { fullName: 'Aman', parentPhone: '6306375483' },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Adding WhatsApp demo class ${CLASS_LEVEL}${SECTION} under schoolId: ${SCHOOL_ID}`);

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // ── 1. Teacher User login + Teacher profile ────────────────────────────────
  await User.findOneAndUpdate(
    { email: DEMO_TEACHER.email },
    {
      firstName: DEMO_TEACHER.firstName,
      lastName: DEMO_TEACHER.lastName,
      email: DEMO_TEACHER.email,
      username: DEMO_TEACHER.username,
      passwordHash,
      role: 'teacher',
      schoolId: SCHOOL_ID,
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  let teacherDoc = await Teacher.findOne({ email: DEMO_TEACHER.email, schoolId: SCHOOL_ID });
  const fullName = `${DEMO_TEACHER.firstName} ${DEMO_TEACHER.lastName}`;
  if (!teacherDoc) {
    teacherDoc = await Teacher.create({
      fullName,
      gender: DEMO_TEACHER.gender,
      employeeId: 'DEMO-EMP-WHATSAPP',
      phone: '9000000000',
      email: DEMO_TEACHER.email,
      department: 'Demo',
      subjects: DEMO_TEACHER.subjects,
      assignedClasses: [`${CLASS_LEVEL}${SECTION}`],
      employmentStatus: 'active',
      schoolId: SCHOOL_ID,
      createdBy: 'seed-whatsapp-demo-class script',
    });
  }
  console.log(`+ Teacher login ready: ${DEMO_TEACHER.email} / ${PASSWORD}`);

  // ── 2. Class-teacher assignment ─────────────────────────────────────────────
  await ClassTeacherAssignment.findOneAndUpdate(
    { schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION },
    {
      schoolId: SCHOOL_ID,
      class: CLASS_LEVEL,
      section: SECTION,
      teacherId: teacherDoc._id.toString(),
      teacherName: fullName,
      updatedBy: 'seed-whatsapp-demo-class script',
    },
    { upsert: true, new: true },
  );
  console.log(`+ Class-teacher assignment ready: ${CLASS_LEVEL}${SECTION} -> ${fullName}`);

  // ── 3. Period slots (reuse DEMO_SCHOOL's if seed-demo-workspace already ran) ─
  let periodSlots = await PeriodSlot.find({ schoolId: SCHOOL_ID, isDeleted: false }).sort({ orderIndex: 1 });
  if (periodSlots.length === 0) {
    const slotDefs = [
      { name: 'Period 1', startTime: '09:00', endTime: '09:40' },
      { name: 'Period 2', startTime: '09:40', endTime: '10:20' },
    ];
    periodSlots = await Promise.all(slotDefs.map((s, i) => PeriodSlot.create({
      schoolId: SCHOOL_ID, name: s.name, orderIndex: i, startTime: s.startTime, endTime: s.endTime,
      isBreak: false, daysApplicable: [1, 2, 3, 4, 5, 6], createdBy: 'seed-whatsapp-demo-class script',
    })));
    console.log(`+ Period slots created: ${periodSlots.length}`);
  }

  const entries: ITimetableEntry[] = [];
  for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
    periodSlots.forEach((slot) => {
      entries.push({ dayOfWeek, slotId: slot._id.toString(), subjectName: 'General', teacherId: teacherDoc!._id.toString(), teacherName: fullName } as ITimetableEntry);
    });
  }
  await Timetable.findOneAndUpdate(
    { schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false },
    {
      schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, academicYear: ACADEMIC_YEAR,
      term: 'Full Year', status: 'published', entries, createdBy: 'seed-whatsapp-demo-class script',
      publishedAt: new Date(), publishedBy: 'seed-whatsapp-demo-class script',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log('+ Timetable published for class 9W');

  // ── 4. The 3 dummy students with real WhatsApp numbers ──────────────────────
  let created = 0;
  for (let i = 0; i < DUMMY_STUDENTS.length; i++) {
    const { fullName: studentName, parentPhone } = DUMMY_STUDENTS[i];
    const admissionNumber = `DEMO-WA-${String(i + 1).padStart(4, '0')}`;

    await Student.findOneAndUpdate(
      { schoolId: SCHOOL_ID, admissionNumber },
      {
        fullName: studentName,
        admissionNumber,
        rollNumber: String(i + 1),
        class: CLASS_LEVEL,
        section: SECTION,
        parentPhone,
        fatherName: studentName,
        address: 'Demo Colony, Demo City',
        admissionStatus: 'active',
        admissionYear: ADMISSION_YEAR,
        tags: ['demo', 'whatsapp-test'],
        schoolId: SCHOOL_ID,
        isDeleted: false,
        createdBy: 'seed-whatsapp-demo-class script',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    created++;
  }
  console.log(`+ Dummy students upserted: ${created}`);

  console.log('\n=== WhatsApp demo login ===');
  console.log(`  ${DEMO_TEACHER.email}  (or username "${DEMO_TEACHER.username}")  /  ${PASSWORD}`);
  console.log(`  Class: ${CLASS_LEVEL}${SECTION}`);
  console.log('  Students:');
  DUMMY_STUDENTS.forEach((s, i) => console.log(`    ${i + 1}. ${s.fullName} — parentPhone ${s.parentPhone}`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
