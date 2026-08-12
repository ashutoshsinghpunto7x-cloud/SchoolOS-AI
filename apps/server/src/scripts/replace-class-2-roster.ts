/**
 * Replace the Class 2 (Roman-numeral "II") student roster with the list
 * provided by the requester, as a single undivided section ("A").
 *
 * Scope:
 *  - Soft-deletes ALL existing active Student docs for schoolId 'school_001',
 *    class 'II' (both former sections 'A' and 'B') — reversible via isDeleted
 *    flag, keeps any historical Attendance/FeeRecord rows referencing their
 *    studentId intact.
 *  - Creates new active Student docs for class II, section 'A', with
 *    rollNumber 1-N (matching the order of the provided list) and a distinct
 *    admission number prefix (ADM-2A-<year>-####).
 *  - Only names were provided — gender, DOB, parent contact, etc. are left
 *    unset and can be filled in later via the Student Directory.
 *  - Explicit replace, not merge: no name-matching against the old roster,
 *    per requester's instruction.
 *
 * Does NOT touch any other class/section, Attendance, or FeeRecord data.
 *
 * Run: npm run seed:replace-class-2 -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Student } from '../features/students/student.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const CLASS_LEVEL = 'II';
const SECTION = 'A';
const ADMISSION_YEAR = new Date().getFullYear();

// Order matches the provided roster list.
const STUDENT_NAMES = [
  'Aakarsh Pandey', 'Arya Gupta', 'Abdullah', 'Aditya Awasthi',
  'Advik Varma', 'Aradhy Singh', 'Areeb Zameer', 'Areeba',
  'Arohi Sahu', 'Arvi Mishra', 'Ashutosh Jaiswal', 'Avya',
  'Debrat Pandey', 'Disha Singh', 'Divyansh', 'Garvi Srivastav',
  'Gauri Nigam', 'Khushi Chaurasiya', 'Mohd. Sahud', 'Mohd. Hamnmad Khan',
  'Mriyant Shukla', 'Mukund Pandey', 'Pavitra Gupta', 'Shail Jaiswal',
  'Shambhavi Shakya', 'Shivansh Kannaujiya', 'Shivansh Srivastav', 'Vaishnavi Pandey',
  'Vidhi', 'Yashashvi Singh', 'Yuvraj Singh', 'Arav Gautam',
  'Reetika Gautam', 'Anaya Srivastava', 'Shrishti Bharti', 'Shaurya P. Singh',
  'Saransh Shukla', 'Ayesha',
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Using schoolId: ${SCHOOL_ID}, class: ${CLASS_LEVEL}, section: ${SECTION}`);

  // ── 1. Soft-delete existing Class 2 roster (both sections A and B) ───────
  const existing = await Student.find({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, isDeleted: false,
  });
  console.log(`\nExisting active students in class II (all sections): ${existing.length}`);

  const softDeleteResult = await Student.updateMany(
    { schoolId: SCHOOL_ID, class: CLASS_LEVEL, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), deletedBy: 'replace-class-2-roster script' },
  );
  console.log(`Soft-deleted: ${softDeleteResult.modifiedCount}`);

  // ── 2. Create the new roster ─────────────────────────────────────────────
  let created = 0;
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const fullName = STUDENT_NAMES[i];
    const rollNumber = String(i + 1);
    const admissionNumber = `ADM-2A-${ADMISSION_YEAR}-${String(i + 1).padStart(4, '0')}`;

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
      createdBy: 'replace-class-2-roster script',
    });
    created++;
  }
  console.log(`\nNew students created: ${created}`);

  // ── 3. Sanity read-back ──────────────────────────────────────────────────
  const activeCount = await Student.countDocuments({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, isDeleted: false,
  });
  console.log(`\nActive students now in class II: ${activeCount}`);

  const sample = await Student.find({ schoolId: SCHOOL_ID, class: CLASS_LEVEL, isDeleted: false })
    .sort({ rollNumber: 1 })
    .lean();
  console.log('Full new roster (by roll number):');
  sample.forEach((s) => console.log(`  ${s.rollNumber}. ${s.fullName} (${s.admissionNumber})`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
