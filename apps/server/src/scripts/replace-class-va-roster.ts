/**
 * Replace the Class V / Section A student roster with the up-to-date list
 * provided by the class teacher.
 *
 * Scope:
 *  - Soft-deletes existing Student docs for schoolId 'school_001', class 'V',
 *    section 'A' (isDeleted: true) — reversible, keeps historical
 *    Attendance/FeeRecord rows referencing their studentId intact.
 *  - Creates new active Student docs for class V-A with:
 *      - rosterOrder = position in the list AS GIVEN (1..N) — default display
 *        order for the attendance list; names are NOT alphabetized.
 *      - rollNumber  = alphabetical rank (1..N) — used only when the
 *        "sort by roll number" filter is switched on.
 *  - Only names were provided — other fields (gender, DOB, parent contact,
 *    admission number, etc.) are left unset and can be filled in later via
 *    the Student Directory.
 *  - Does NOT touch the existing ClassTeacherAssignment for V-A.
 *
 * Run: npm run seed:replace-class-va -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Student } from '../features/students/student.model';
import { ClassTeacherAssignment } from '../features/classes/class-teacher.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const CLASS_LEVEL = 'V';
const SECTION = 'A';
const ADMISSION_YEAR = new Date().getFullYear();

// Order matches exactly what the class teacher provided — do NOT reorder.
const STUDENT_NAMES = [
  'Aarush Senker',
  'Abu-Talha',
  'Aditoi Tiwari',
  'Aditya Sahu',
  'Aaradhya-1',
  'Aaradhya Shukla',
  'Arnav Shukla',
  'Ayansh',
  'Ayeza',
  'Baoumi Awasthi',
  'Divyansh Senker',
  'Faizam Ahmad',
  'Jasnoor Singh Birdi',
  'Kashi Tiwari',
  'Rudra Kamnaujjiya',
  'Rudransh Kamnaujjiya',
  'Saraa Sahu',
  'Saubhagya Pandey',
  'Shabrat Singh',
  'Shivansh Verma-1',
  'Shubh Rawat',
  'Siddhi Mishra',
  'Stuti Mishra',
  'Md. Zaid',
  'Shaurya Upadhyay',
  'Shivay Prajapati',
  'Aryam Sharma',
  'Kartik Gaur',
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Using schoolId: ${SCHOOL_ID}, class: ${CLASS_LEVEL}${SECTION}`);

  // ── Sanity: report the assigned class teacher (left untouched) ───────────
  const assignment = await ClassTeacherAssignment.findOne({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION,
  });
  if (assignment) {
    console.log(`Existing ClassTeacherAssignment for V-A: teacherName="${assignment.teacherName}" (left untouched)`);
  } else {
    console.warn('  ! No ClassTeacherAssignment found for class V, section A — proceeding anyway.');
  }

  // ── 1. Soft-delete existing V-A roster ────────────────────────────────────
  const existing = await Student.find({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  });
  console.log(`\nExisting active students in V-A: ${existing.length}`);

  const softDeleteResult = await Student.updateMany(
    { schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), deletedBy: 'replace-class-va-roster script' },
  );
  console.log(`Soft-deleted: ${softDeleteResult.modifiedCount}`);

  // ── 2. Compute alphabetical roll numbers, independent of given order ────
  const alphabetical = [...STUDENT_NAMES].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const rollNumberByName = new Map<string, number>();
  alphabetical.forEach((name, i) => rollNumberByName.set(name, i + 1));

  // ── 3. Create the new roster, preserving the given order via rosterOrder ─
  let created = 0;
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const fullName = STUDENT_NAMES[i];
    const rosterOrder = i + 1;
    const rollNumber = String(rollNumberByName.get(fullName));
    const admissionNumber = `ADM-VA-${ADMISSION_YEAR}-${String(rosterOrder).padStart(4, '0')}`;

    await Student.create({
      fullName,
      admissionNumber,
      rollNumber,
      rosterOrder,
      class: CLASS_LEVEL,
      section: SECTION,
      admissionStatus: 'active',
      admissionYear: ADMISSION_YEAR,
      tags: [],
      schoolId: SCHOOL_ID,
      createdBy: 'replace-class-va-roster script',
    });
    created++;
  }
  console.log(`\nNew students created: ${created}`);

  // ── 4. Sanity read-back ───────────────────────────────────────────────────
  const activeCount = await Student.countDocuments({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  });
  console.log(`\nActive students now in V-A: ${activeCount}`);

  const sample = await Student.find({ schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false })
    .sort({ rosterOrder: 1 })
    .lean();
  console.log('As-given order (default display order) with roll numbers:');
  sample.forEach((s) => console.log(`  ${s.rosterOrder}. ${s.fullName}  (roll ${s.rollNumber})`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
