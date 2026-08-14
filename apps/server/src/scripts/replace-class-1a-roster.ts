/**
 * Replace the Class 1 / Section A (I-A) student roster with the real,
 * up-to-date list of students provided by the class teacher (Gunjan Madan).
 *
 * Scope:
 *  - Soft-deletes existing Student docs for schoolId 'school_001', class 'I',
 *    section 'A' (isDeleted: true) — reversible, and keeps any historical
 *    Attendance/FeeRecord rows referencing their studentId intact.
 *  - Creates new active Student docs for class I-A with rollNumber 1-N
 *    (matching the order of the provided list) and a distinct admission
 *    number prefix (ADM-1A-<year>-####) that can't collide with the general
 *    ADM-<year>-#### numbering used elsewhere.
 *  - Only names were provided — gender, DOB, parent contact, etc. are left
 *    unset and can be filled in later via the Student Directory / accountant
 *    workspace.
 *
 * Does NOT touch any other class/section, Attendance, or FeeRecord data.
 *
 * Run: npm run seed:replace-class-1a -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Student } from '../features/students/student.model';
import { Teacher } from '../features/teachers/teacher.model';
import { ClassTeacherAssignment } from '../features/classes/class-teacher.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const CLASS_LEVEL = 'I';
const SECTION = 'A';
const ADMISSION_YEAR = new Date().getFullYear();

// Order matches the provided roster list.
const STUDENT_NAMES = [
  'Abhinav Awasthi', 'Abhinav Joshi', 'Aditya Maurya', 'Adiba Awasthi',
  'Ahan Srivastava', 'Akshat', 'Aditri Gupta', 'Ankisha Shukla',
  'Anugya Singh', 'Apoorvi Gupta', 'Aradhya Verma', 'Arnav Gupta',
  'Arohi Pal', 'Arth Tiwari', 'Atharv Maurya', 'Ayank Nigam',
  'Ayush Chaudhary', 'Deepti Singh', 'Harsh Chaurasia', 'Harshita Dixit',
  'Inaya Imran', 'Kartikey Mishra', 'Kavya Jaiswal', 'Keshwam Tiwari',
  'Lakshy Chaurasiya', 'Manvendra Pratap Singh', 'Mayank Sahu', 'Nitya Jaiswal',
  'Nityansh Mani Tripathi', 'Pratyush Sharma', 'Praval Pratap Singh', 'Priyanshu',
  'Puneet Saini', 'Raj Aditya Vikram', 'Reyansh Gupta', 'Rikesh Singh',
  'Rudraksh Mishra', 'Samriddhi Tiwari', 'Sanvika Verma', 'Sanya Singh',
  'Shivansh Dwivedi', 'Shivansh Raj Singh', 'Shubh', 'Taashi Gupta',
  'Trishika Yagyani', 'Ujjwal Nigam', 'Vaidik Dwivedi', 'Vaidika Mishra',
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Using schoolId: ${SCHOOL_ID}, class: ${CLASS_LEVEL}${SECTION}`);

  // ── Sanity: confirm Gunjan Madan is the assigned class teacher ───────────
  const teacher = await Teacher.findOne({
    schoolId: SCHOOL_ID,
    fullName: /gunjan madan/i,
    isDeleted: false,
  });
  const assignment = await ClassTeacherAssignment.findOne({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION,
  });

  if (teacher) {
    console.log(`Found Teacher: ${teacher.fullName} (_id: ${teacher._id})`);
  } else {
    console.warn('  ! No Teacher document matching "Gunjan Madan" found — proceeding anyway.');
  }
  if (assignment) {
    const match = teacher && assignment.teacherId === teacher._id.toString();
    console.log(`Existing ClassTeacherAssignment for I-A: teacherName="${assignment.teacherName}" (${match ? 'matches' : 'DOES NOT MATCH'} Gunjan Madan record)`);
  } else {
    console.warn('  ! No ClassTeacherAssignment found for class I, section A.');
  }

  // ── 1. Soft-delete existing I-A roster ───────────────────────────────────
  const existing = await Student.find({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  });
  console.log(`\nExisting active students in I-A: ${existing.length}`);

  const softDeleteResult = await Student.updateMany(
    { schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), deletedBy: 'replace-class-1a-roster script' },
  );
  console.log(`Soft-deleted: ${softDeleteResult.modifiedCount}`);

  // ── 2. Create the new roster ─────────────────────────────────────────────
  let created = 0;
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const fullName = STUDENT_NAMES[i];
    const rollNumber = String(i + 1);
    const admissionNumber = `ADM-1A-${ADMISSION_YEAR}-${String(i + 1).padStart(4, '0')}`;

    await Student.create({
      fullName,
      admissionNumber,
      rollNumber,
      class: CLASS_LEVEL,
      section: SECTION,
      admissionStatus: 'active',
      admissionYear: ADMISSION_YEAR,
      tags: [],
      schoolId: SCHOOL_ID,
      createdBy: 'replace-class-1a-roster script',
    });
    created++;
  }
  console.log(`\nNew students created: ${created}`);

  // ── 3. Sanity read-back ──────────────────────────────────────────────────
  const activeCount = await Student.countDocuments({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  });
  console.log(`\nActive students now in I-A: ${activeCount}`);

  const sample = await Student.find({ schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false })
    .sort({ rollNumber: 1 })
    .limit(5)
    .lean();
  console.log('Sample (first 5 by roll number):');
  sample.forEach((s) => console.log(`  ${s.rollNumber}. ${s.fullName} (${s.admissionNumber})`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
