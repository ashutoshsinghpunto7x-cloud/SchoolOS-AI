/**
 * Full reset + realistic reseed of Student data for the demo/dev environment.
 *
 * Scope (confirmed with the school's client):
 *  - Hard-deletes ALL documents in: Student, Attendance, FeeRecord, FeePayment,
 *    StudentNote — scoped to schoolId 'school_001' (the schoolId every other
 *    collection in this DB actually uses; Student/FeeRecord/ClassTeacherAssignment
 *    models previously defaulted to the stray 'DEMO_SCHOOL' value, which has been
 *    fixed in their schemas as part of this change).
 *  - Seeds 50 realistic North-Indian (Kanpur, Uttar Pradesh) students, classes
 *    1-8, weighted so classes 1-5 are well populated (6-8 students/section).
 *  - Ensures classes 1-5 (sections A/B) have a ClassTeacherAssignment.
 *  - Ensures classes 1-5 (sections A/B) have full Mon-Sat (dayOfWeek 1-6)
 *    Timetable coverage using existing PeriodSlot docs and real Teacher profiles.
 *  - Backs a handful of existing teacher00N@schoolos.ai login accounts with real
 *    Teacher profile documents (by email) so class-teacher/timetable data
 *    resolves to an actual teacher, not just a floating name string.
 *
 * Does NOT touch: User accounts, Teacher accounts/logins, PeriodSlot definitions,
 * or any other collection.
 *
 * Run: npm run seed:reset-students -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Student } from '../features/students/student.model';
import { Attendance } from '../features/attendance/attendance.model';
import { FeeRecord } from '../features/fees/fee.model';
import { FeePayment } from '../features/fees/fee.payment.model';
import { StudentNote } from '../features/students/student.note.model';
import { User } from '../features/users/user.model';
import { Teacher } from '../features/teachers/teacher.model';
import { ClassTeacherAssignment } from '../features/classes/class-teacher.model';
import { PeriodSlot } from '../features/timetable/timetable.period.model';
import { Timetable, ITimetableEntry } from '../features/timetable/timetable.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const ACADEMIC_YEAR = '2026-27';
const ADMISSION_YEAR = new Date().getFullYear();

// ── Name pools (realistic UP / Kanpur-area) ────────────────────────────────────

const SURNAMES = [
  'Yadav', 'Verma', 'Mishra', 'Tiwari', 'Singh', 'Gupta', 'Sharma', 'Pandey',
  'Khan', 'Ansari', 'Srivastava', 'Dubey', 'Chauhan', 'Rastogi',
];

const BOY_FIRST_NAMES = [
  'Aarav', 'Rohan', 'Mohammed Kaif', 'Aditya', 'Vivaan', 'Krishna', 'Aryan',
  'Shivansh', 'Devansh', 'Arjun', 'Kabir', 'Saad', 'Faizan', 'Ansh', 'Om',
  'Yash', 'Harsh', 'Rudra', 'Vihaan', 'Ayaan', 'Sameer', 'Imran', 'Abhinav',
  'Naman',
];

const GIRL_FIRST_NAMES = [
  'Priya', 'Ananya', 'Kavya', 'Sanya', 'Diya', 'Ishita', 'Aaradhya', 'Zara',
  'Fatima', 'Saanvi', 'Riya', 'Anaya', 'Khushi', 'Pari', 'Nikita', 'Aliya',
  'Simran', 'Gunjan', 'Shreya', 'Vaishnavi', 'Areeba', 'Muskan', 'Pihu',
  'Divya',
];

const FATHER_FIRST_NAMES = [
  'Rajesh', 'Sanjay', 'Anil', 'Suresh', 'Manoj', 'Ramesh', 'Vinod', 'Dinesh',
  'Ashok', 'Pradeep', 'Naeem', 'Iqbal', 'Shakeel', 'Rakesh', 'Brijesh',
  'Satish', 'Yogendra', 'Devendra', 'Arvind', 'Mahendra',
];

const MOTHER_FIRST_NAMES = [
  'Sunita', 'Rekha', 'Kavita', 'Anita', 'Meena', 'Poonam', 'Shobha', 'Nirmala',
  'Kiran', 'Geeta', 'Shabana', 'Nazma', 'Rukhsana', 'Neelam', 'Sarita',
  'Vandana', 'Renu', 'Manju', 'Pushpa', 'Rachna',
];

const KANPUR_LOCALITIES = [
  'Near Sabzi Mandi, Kakadeo, Kanpur – 208025, Uttar Pradesh',
  'Swaroop Nagar, Kanpur – 208002, Uttar Pradesh',
  'Kidwai Nagar, Kanpur – 208011, Uttar Pradesh',
  'Govind Nagar, Kanpur – 208006, Uttar Pradesh',
  'Ashok Nagar, Kanpur – 208012, Uttar Pradesh',
  'Civil Lines, Kanpur – 208001, Uttar Pradesh',
  'Naveen Nagar, Kanpur – 208025, Uttar Pradesh',
  'Yashoda Nagar, Kanpur – 208011, Uttar Pradesh',
  'Vikas Nagar, Kanpur – 208002, Uttar Pradesh',
  'Rawatpur, Kanpur – 208002, Uttar Pradesh',
  'Barra, Kanpur – 208027, Uttar Pradesh',
  'Kalyanpur, Kanpur – 208017, Uttar Pradesh',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Realistic 10-digit Indian mobile: starts 6/7/8/9, not all-same-digit. */
function randomPhone(): string {
  const first = pick(['6', '7', '8', '9']);
  let rest = '';
  for (let i = 0; i < 9; i++) rest += Math.floor(Math.random() * 10);
  // Avoid degenerate all-same-digit numbers.
  if (/^(\d)\1{8}$/.test(rest)) return randomPhone();
  return first + rest;
}

function randomDob(classLevel: number): Date {
  // Roughly age = classLevel + 5, +/- a bit of spread.
  const baseAge = classLevel + 5;
  const year = ADMISSION_YEAR - baseAge - Math.floor(Math.random() * 1); // keep tight
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return new Date(Date.UTC(year, month - 1, day));
}

function tuitionFeeForClass(classLevel: number): number {
  // Junior classes cheaper, senior classes more expensive. Range ~1500-3000.
  if (classLevel <= 2) return 1500;
  if (classLevel <= 5) return 1800 + (classLevel - 3) * 150;
  if (classLevel <= 8) return 2400 + (classLevel - 6) * 150;
  return 3000;
}

async function generateAdmissionNumber(year: number, seq: number): Promise<string> {
  return `ADM-${year}-${String(seq).padStart(4, '0')}`;
}

// ── Class/section plan ───────────────────────────────────────────────────────
// All 50 students live within classes 1-5 (not spread into 6-8) — the
// fee-reminder/attendance/timetable feature set is explicitly scoped to
// classes 1-5, so that's where every seeded student, class-teacher assignment,
// and timetable entry needs to be for the app to feel real when demoed there.

interface ClassPlan {
  classLevel: number;
  sections: string[];
  perSection: number;
}

const CLASS_PLAN: ClassPlan[] = [
  { classLevel: 1, sections: ['A', 'B'], perSection: 5 }, // 10
  { classLevel: 2, sections: ['A', 'B'], perSection: 5 }, // 10
  { classLevel: 3, sections: ['A', 'B'], perSection: 5 }, // 10
  { classLevel: 4, sections: ['A', 'B'], perSection: 5 }, // 10
  { classLevel: 5, sections: ['A', 'B'], perSection: 5 }, // 10
];
// Total: 10+10+10+10+10 = 50

const CLASSES_NEEDING_TEACHER_COVERAGE = [1, 2, 3, 4, 5];
const SECTIONS_NEEDING_TEACHER_COVERAGE = ['A', 'B'];

// Teacher login accounts (already seeded by seed-teachers.ts) to back with real
// Teacher profiles — just enough to cover classes 1-5 x sections A/B (10 slots).
// Reused round-robin so a handful of teachers cover multiple class/section slots,
// same as a small real school would.
const TEACHER_EMAILS_TO_BACK = [
  'teacher001@schoolos.ai',
  'teacher002@schoolos.ai',
  'teacher003@schoolos.ai',
  'teacher004@schoolos.ai',
  'teacher005@schoolos.ai',
];

const SUBJECT_ROTATION = ['Hindi', 'English', 'Maths', 'EVS', 'Science', 'Social Studies'];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Using schoolId: ${SCHOOL_ID}`);

  // ── 1. Hard delete existing scoped data ──────────────────────────────────
  const [delStudents, delAttendance, delFeeRecords, delFeePayments, delNotes] = await Promise.all([
    Student.deleteMany({ schoolId: SCHOOL_ID }),
    Attendance.deleteMany({ schoolId: SCHOOL_ID }),
    FeeRecord.deleteMany({ schoolId: SCHOOL_ID }),
    FeePayment.deleteMany({ schoolId: SCHOOL_ID }),
    StudentNote.deleteMany({ schoolId: SCHOOL_ID }),
  ]);

  // Also clean up any leftover DEMO_SCHOOL-scoped rows in these same collections
  // (stray data from before the schema-default fix), so nothing orphaned remains.
  const [delStudentsDemo, delFeeRecordsDemo] = await Promise.all([
    Student.deleteMany({ schoolId: 'DEMO_SCHOOL' }),
    FeeRecord.deleteMany({ schoolId: 'DEMO_SCHOOL' }),
  ]);

  console.log('\n--- Deletion summary ---');
  console.log(`Students deleted (school_001): ${delStudents.deletedCount}`);
  console.log(`Students deleted (stray DEMO_SCHOOL): ${delStudentsDemo.deletedCount}`);
  console.log(`Attendance deleted: ${delAttendance.deletedCount}`);
  console.log(`FeeRecords deleted (school_001): ${delFeeRecords.deletedCount}`);
  console.log(`FeeRecords deleted (stray DEMO_SCHOOL): ${delFeeRecordsDemo.deletedCount}`);
  console.log(`FeePayments deleted: ${delFeePayments.deletedCount}`);
  console.log(`StudentNotes deleted: ${delNotes.deletedCount}`);

  // ── 2. Back a handful of teacher accounts with real Teacher profiles ─────
  const teacherProfiles: { userEmail: string; teacherId: string; teacherName: string }[] = [];

  let empSeq = 2; // EMP-2026-0001 already used by Yashi Singh
  for (const email of TEACHER_EMAILS_TO_BACK) {
    const user = await User.findOne({ email, schoolId: SCHOOL_ID });
    if (!user) {
      console.warn(`  ! User not found for ${email}, skipping Teacher profile backing.`);
      continue;
    }

    let teacherDoc = await Teacher.findOne({ email, schoolId: SCHOOL_ID });
    if (!teacherDoc) {
      const fullName = `${user.firstName} ${user.lastName}`.trim();
      teacherDoc = await Teacher.create({
        fullName,
        gender: pick(['male', 'female']),
        employeeId: `EMP-${ADMISSION_YEAR}-${String(empSeq).padStart(4, '0')}`,
        phone: randomPhone(),
        email,
        department: pick(['Primary', 'Hindi', 'Maths', 'Science']),
        subjects: shuffle(SUBJECT_ROTATION).slice(0, 2),
        assignedClasses: [],
        employmentStatus: 'active',
        schoolId: SCHOOL_ID,
        createdBy: 'reset-and-seed-students script',
      });
      empSeq++;
      console.log(`  + Created Teacher profile for ${email} (${fullName})`);
    } else {
      console.log(`  = Teacher profile already exists for ${email}`);
    }

    teacherProfiles.push({
      userEmail: email,
      teacherId: teacherDoc._id.toString(),
      teacherName: teacherDoc.fullName,
    });
  }

  if (teacherProfiles.length === 0) {
    throw new Error('No teacher profiles available to back class 1-5 coverage — aborting.');
  }

  // ── 3. Seed 50 students ───────────────────────────────────────────────────
  let admissionSeq = 1;
  let created = 0;
  const createdStudents: { _id: string; class: string; section: string }[] = [];

  for (const plan of CLASS_PLAN) {
    for (const section of plan.sections) {
      for (let i = 0; i < plan.perSection; i++) {
        const isBoy = Math.random() < 0.5;
        const firstName = isBoy ? pick(BOY_FIRST_NAMES) : pick(GIRL_FIRST_NAMES);
        const surname = pick(SURNAMES);
        const fullName = `${firstName} ${surname}`;
        const fatherName = `${pick(FATHER_FIRST_NAMES)} ${surname}`;
        const motherName = `${pick(MOTHER_FIRST_NAMES)} ${surname}`;
        const admissionNumber = await generateAdmissionNumber(ADMISSION_YEAR, admissionSeq);

        const student = await Student.create({
          fullName,
          admissionNumber,
          rollNumber: String(i + 1),
          class: String(plan.classLevel),
          section,
          gender: isBoy ? 'male' : 'female',
          dateOfBirth: randomDob(plan.classLevel),
          fatherName,
          motherName,
          parentPhone: randomPhone(),
          alternatePhone: Math.random() < 0.3 ? randomPhone() : undefined,
          address: pick(KANPUR_LOCALITIES),
          admissionStatus: 'active',
          admissionYear: ADMISSION_YEAR,
          tags: [],
          monthlyTuitionFee: tuitionFeeForClass(plan.classLevel),
          schoolId: SCHOOL_ID,
          createdBy: 'reset-and-seed-students script',
        });

        createdStudents.push({ _id: student._id.toString(), class: student.class, section: student.section });
        admissionSeq++;
        created++;
      }
    }
  }

  console.log(`\n--- Seed summary ---`);
  console.log(`Students created: ${created}`);

  // ── 4. Class-teacher assignments for classes 1-5, sections A/B ───────────
  let teacherRoundRobin = 0;
  const classTeacherAssignments: { class: string; section: string; teacherName: string }[] = [];

  for (const classLevel of CLASSES_NEEDING_TEACHER_COVERAGE) {
    for (const section of SECTIONS_NEEDING_TEACHER_COVERAGE) {
      const teacher = teacherProfiles[teacherRoundRobin % teacherProfiles.length];
      teacherRoundRobin++;

      await ClassTeacherAssignment.findOneAndUpdate(
        { schoolId: SCHOOL_ID, class: String(classLevel), section },
        {
          schoolId: SCHOOL_ID,
          class: String(classLevel),
          section,
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          updatedBy: 'reset-and-seed-students script',
        },
        { upsert: true, new: true }
      );

      classTeacherAssignments.push({ class: String(classLevel), section, teacherName: teacher.teacherName });
    }
  }

  console.log(`Class-teacher assignments upserted: ${classTeacherAssignments.length}`);

  // ── 5. Timetable coverage for classes 1-5, sections A/B, all weekdays ────
  const periodSlots = await PeriodSlot.find({ schoolId: SCHOOL_ID, isDeleted: false }).sort({ orderIndex: 1 });
  if (periodSlots.length === 0) {
    throw new Error('No PeriodSlot documents found for school_001 — cannot build timetable entries.');
  }
  console.log(`Reusing ${periodSlots.length} existing PeriodSlot(s).`);

  let timetableUpserts = 0;
  let totalEntriesWritten = 0;

  for (const classLevel of CLASSES_NEEDING_TEACHER_COVERAGE) {
    for (const section of SECTIONS_NEEDING_TEACHER_COVERAGE) {
      const teacher = teacherProfiles[(classLevel + section.charCodeAt(0)) % teacherProfiles.length];

      const entries: ITimetableEntry[] = [];
      for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
        periodSlots.forEach((slot, idx) => {
          if (slot.isBreak) return;
          const subjectName = SUBJECT_ROTATION[(idx + dayOfWeek) % SUBJECT_ROTATION.length];
          entries.push({
            dayOfWeek,
            slotId: slot._id.toString(),
            subjectName,
            teacherId: teacher.teacherId,
            teacherName: teacher.teacherName,
          } as ITimetableEntry);
        });
      }

      let timetable = await Timetable.findOne({
        schoolId: SCHOOL_ID,
        class: String(classLevel),
        section,
        isDeleted: false,
      });

      if (timetable) {
        timetable.entries = entries;
        timetable.status = 'published';
        timetable.academicYear = ACADEMIC_YEAR;
        timetable.publishedAt = timetable.publishedAt ?? new Date();
        timetable.publishedBy = timetable.publishedBy ?? 'reset-and-seed-students script';
        timetable.updatedBy = 'reset-and-seed-students script';
        await timetable.save();
      } else {
        timetable = await Timetable.create({
          schoolId: SCHOOL_ID,
          class: String(classLevel),
          section,
          academicYear: ACADEMIC_YEAR,
          term: 'Full Year',
          status: 'published',
          entries,
          createdBy: 'reset-and-seed-students script',
          publishedAt: new Date(),
          publishedBy: 'reset-and-seed-students script',
        });
      }

      timetableUpserts++;
      totalEntriesWritten += entries.length;
    }
  }

  console.log(`Timetables upserted (classes 1-5, sections A/B): ${timetableUpserts}`);
  console.log(`Total timetable entries written: ${totalEntriesWritten}`);

  // ── 6. Sanity read-back ────────────────────────────────────────────────
  console.log('\n--- Sanity read-back ---');
  const studentCount = await Student.countDocuments({ schoolId: SCHOOL_ID });
  console.log(`Student.countDocuments({ schoolId: 'school_001' }) = ${studentCount}`);

  const remainingDemoSchoolStudents = await Student.countDocuments({ schoolId: 'DEMO_SCHOOL' });
  const remainingDemoSchoolFees = await FeeRecord.countDocuments({ schoolId: 'DEMO_SCHOOL' });
  console.log(`Remaining stray DEMO_SCHOOL students: ${remainingDemoSchoolStudents}`);
  console.log(`Remaining stray DEMO_SCHOOL fee records: ${remainingDemoSchoolFees}`);

  const sampleStudents = await Student.find({ schoolId: SCHOOL_ID }).limit(3).lean();
  console.log('\nSample students:');
  sampleStudents.forEach((s) => console.log(JSON.stringify(s, null, 2)));

  for (const classLevel of [1, 3, 5]) {
    const tt = await Timetable.findOne({ schoolId: SCHOOL_ID, class: String(classLevel), section: 'A' }).lean();
    console.log(`\nClass ${classLevel}A timetable entries count: ${tt?.entries?.length ?? 0}, status: ${tt?.status}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
