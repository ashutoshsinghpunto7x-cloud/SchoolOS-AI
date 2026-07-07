/**
 * Seeds 40 realistic North-Indian students (8 each, classes 1-5, section A)
 * and rebuilds the full Mon-Sat timetable for those 5 class-sections so they
 * belong to Yashi Singh (yashisingh@gmail.com) — matching the same
 * User<->Teacher (by email) and Timetable entries.teacherId linkage the
 * teacher-workspace API relies on to build "My Classes" / dashboard data.
 *
 * Scope: only touches Student/Attendance/FeeRecord/FeePayment/StudentNote/
 * ClassTeacherAssignment/Timetable rows for schoolId 'school_001',
 * class in [1..5], section 'A'. Does not touch section B or any other class.
 *
 * Run: npx tsx src/scripts/seed-yashi-classes.ts   (from apps/server)
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
const TEACHER_EMAIL = 'yashisingh@gmail.com';
const SECTION = 'A';
const CLASSES = [1, 2, 3, 4, 5];
const PER_CLASS = 8; // 5 classes x 8 = 40

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

const SUBJECT_ROTATION = ['Hindi', 'English', 'Maths', 'EVS', 'Science', 'Social Studies'];

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

function tuitionFeeForClass(classLevel: number): number {
  if (classLevel <= 2) return 1500;
  return 1800 + (classLevel - 3) * 150;
}

async function nextAdmissionSeq(): Promise<number> {
  const last = await Student.find({}).sort({ admissionNumber: -1 }).limit(1).lean();
  if (last.length === 0) return 1;
  const match = /ADM-\d{4}-(\d+)/.exec(last[0].admissionNumber);
  return match ? parseInt(match[1], 10) + 1 : 1;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. schoolId=${SCHOOL_ID}, teacher=${TEACHER_EMAIL}`);

  // ── 1. Resolve Yashi Singh's Teacher profile (linked to her User login by email) ──
  const user = await User.findOne({ email: TEACHER_EMAIL, schoolId: SCHOOL_ID });
  if (!user) throw new Error(`No User found with email ${TEACHER_EMAIL}`);

  const teacher = await Teacher.findOne({ email: TEACHER_EMAIL, schoolId: SCHOOL_ID, isDeleted: false });
  if (!teacher) throw new Error(`No Teacher profile found with email ${TEACHER_EMAIL}`);

  const teacherId = teacher._id.toString();
  const teacherName = teacher.fullName;
  console.log(`Resolved Teacher: ${teacherName} (${teacherId})`);

  // ── 2. Wipe existing section-A data for classes 1-5 only ─────────────────
  const classStrs = CLASSES.map(String);
  const existingStudents = await Student.find({ schoolId: SCHOOL_ID, class: { $in: classStrs }, section: SECTION }).select('_id').lean();
  const existingIds = existingStudents.map((s) => s._id);

  const [delStudents, delAttendance, delFeeRecords, delFeePayments, delNotes] = await Promise.all([
    Student.deleteMany({ _id: { $in: existingIds } }),
    Attendance.deleteMany({ schoolId: SCHOOL_ID, class: { $in: classStrs }, section: SECTION }),
    FeeRecord.deleteMany({ schoolId: SCHOOL_ID, studentId: { $in: existingIds.map((id) => id.toString()) } }),
    FeePayment.deleteMany({ schoolId: SCHOOL_ID, studentId: { $in: existingIds.map((id) => id.toString()) } }),
    StudentNote.deleteMany({ schoolId: SCHOOL_ID, studentId: { $in: existingIds.map((id) => id.toString()) } }),
  ]);

  console.log('\n--- Cleanup summary (classes 1-5, section A only) ---');
  console.log(`Students deleted: ${delStudents.deletedCount}`);
  console.log(`Attendance deleted: ${delAttendance.deletedCount}`);
  console.log(`FeeRecords deleted: ${delFeeRecords.deletedCount}`);
  console.log(`FeePayments deleted: ${delFeePayments.deletedCount}`);
  console.log(`StudentNotes deleted: ${delNotes.deletedCount}`);

  // ── 3. Seed 40 students (8 per class, classes 1-5, section A) ────────────
  let admissionSeq = await nextAdmissionSeq();
  let created = 0;

  for (const classLevel of CLASSES) {
    for (let i = 0; i < PER_CLASS; i++) {
      const isBoy = Math.random() < 0.5;
      const firstName = isBoy ? pick(BOY_FIRST_NAMES) : pick(GIRL_FIRST_NAMES);
      const surname = pick(SURNAMES);
      const fullName = `${firstName} ${surname}`;
      const fatherName = `${pick(FATHER_FIRST_NAMES)} ${surname}`;
      const motherName = `${pick(MOTHER_FIRST_NAMES)} ${surname}`;
      const admissionNumber = `ADM-${ADMISSION_YEAR}-${String(admissionSeq).padStart(4, '0')}`;

      await Student.create({
        fullName,
        admissionNumber,
        rollNumber: String(i + 1),
        class: String(classLevel),
        section: SECTION,
        gender: isBoy ? 'male' : 'female',
        dateOfBirth: randomDob(classLevel),
        fatherName,
        motherName,
        parentPhone: randomPhone(),
        alternatePhone: Math.random() < 0.3 ? randomPhone() : undefined,
        address: pick(KANPUR_LOCALITIES),
        admissionStatus: 'active',
        admissionYear: ADMISSION_YEAR,
        tags: [],
        monthlyTuitionFee: tuitionFeeForClass(classLevel),
        schoolId: SCHOOL_ID,
        createdBy: 'seed-yashi-classes script',
      });

      admissionSeq++;
      created++;
    }
  }

  console.log(`\nStudents created: ${created} (classes 1-5, section A)`);

  // ── 4. Class-teacher assignment: classes 1-5, section A -> Yashi Singh ───
  for (const classLevel of CLASSES) {
    await ClassTeacherAssignment.findOneAndUpdate(
      { schoolId: SCHOOL_ID, class: String(classLevel), section: SECTION },
      {
        schoolId: SCHOOL_ID,
        class: String(classLevel),
        section: SECTION,
        teacherId,
        teacherName,
        updatedBy: 'seed-yashi-classes script',
      },
      { upsert: true, new: true },
    );
  }
  console.log(`Class-teacher assignments upserted for classes 1-5, section A -> ${teacherName}`);

  // ── 5. Rebuild full Mon-Sat timetable for classes 1-5, section A ────────
  const periodSlots = await PeriodSlot.find({ schoolId: SCHOOL_ID, isDeleted: false }).sort({ orderIndex: 1 });
  if (periodSlots.length === 0) throw new Error('No PeriodSlot documents found — cannot build timetable entries.');
  console.log(`Reusing ${periodSlots.length} existing PeriodSlot(s).`);

  let timetableUpserts = 0;
  let totalEntriesWritten = 0;

  for (const classLevel of CLASSES) {
    const entries: ITimetableEntry[] = [];
    for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
      periodSlots.forEach((slot, idx) => {
        if (slot.isBreak) return;
        const subjectName = SUBJECT_ROTATION[(idx + dayOfWeek) % SUBJECT_ROTATION.length];
        entries.push({
          dayOfWeek,
          slotId: slot._id.toString(),
          subjectName,
          teacherId,
          teacherName,
        } as ITimetableEntry);
      });
    }

    let timetable = await Timetable.findOne({
      schoolId: SCHOOL_ID,
      class: String(classLevel),
      section: SECTION,
      academicYear: ACADEMIC_YEAR,
      isDeleted: false,
    });

    if (timetable) {
      timetable.entries = entries;
      timetable.status = 'published';
      timetable.publishedAt = timetable.publishedAt ?? new Date();
      timetable.publishedBy = timetable.publishedBy ?? 'seed-yashi-classes script';
      timetable.updatedBy = 'seed-yashi-classes script';
      await timetable.save();
    } else {
      timetable = await Timetable.create({
        schoolId: SCHOOL_ID,
        class: String(classLevel),
        section: SECTION,
        academicYear: ACADEMIC_YEAR,
        term: 'Full Year',
        status: 'published',
        entries,
        createdBy: 'seed-yashi-classes script',
        publishedAt: new Date(),
        publishedBy: 'seed-yashi-classes script',
      });
    }

    timetableUpserts++;
    totalEntriesWritten += entries.length;
  }

  console.log(`Timetables upserted (classes 1-5, section A): ${timetableUpserts}`);
  console.log(`Total timetable entries written: ${totalEntriesWritten}`);

  // ── 6. Keep Teacher.assignedClasses in sync for display consistency ─────
  teacher.assignedClasses = CLASSES.map((c) => `${c}${SECTION.toLowerCase()}`);
  await teacher.save();
  console.log(`Teacher.assignedClasses updated: ${teacher.assignedClasses.join(', ')}`);

  // ── 7. Sanity read-back ───────────────────────────────────────────────
  console.log('\n--- Sanity read-back ---');
  const studentCount = await Student.countDocuments({ schoolId: SCHOOL_ID, class: { $in: classStrs }, section: SECTION });
  console.log(`Students in classes 1-5 section A: ${studentCount}`);

  for (const classLevel of CLASSES) {
    const tt = await Timetable.findOne({ schoolId: SCHOOL_ID, class: String(classLevel), section: SECTION, academicYear: ACADEMIC_YEAR }).lean();
    const matchesTeacher = tt?.entries.every((e) => e.teacherId === teacherId);
    console.log(`Class ${classLevel}A: entries=${tt?.entries?.length ?? 0}, status=${tt?.status}, allEntriesAssignedToYashi=${matchesTeacher}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
