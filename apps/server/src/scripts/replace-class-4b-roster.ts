/**
 * Replace the Class IV / Section B student roster with the list provided by
 * the class teacher (Shruti Yadav).
 *
 * Scope:
 *  - Soft-deletes existing Student docs for schoolId 'school_001', class 'IV',
 *    section 'B' (isDeleted: true) — reversible, keeps historical
 *    Attendance/FeeRecord rows referencing their studentId intact.
 *  - Creates new active Student docs for class IV-B with:
 *      - rosterOrder = position in the list AS GIVEN (1..N) — this is the
 *        default display order for the attendance list; names are NOT
 *        alphabetized or otherwise rearranged for the default view.
 *      - rollNumber  = alphabetical rank (1..N) — used only when the
 *        "sort by roll number" filter is switched on.
 *  - Only names were provided — other fields are left unset.
 *  - Does NOT touch the existing ClassTeacherAssignment for IV-B (already
 *    correctly links "MS. SHRUTI YADAV").
 *
 * Run: npm run seed:replace-class-4b -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Student } from '../features/students/student.model';
import { ClassTeacherAssignment } from '../features/classes/class-teacher.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const CLASS_LEVEL = 'IV';
const SECTION = 'B';
const ADMISSION_YEAR = new Date().getFullYear();

// Order matches exactly what the class teacher provided — do NOT reorder.
const STUDENT_NAMES = [
  'Aditi Singh',
  'Alisha',
  'Anaya Rawat',
  'Anushka Mishra',
  'Anushka Tripathi',
  'Aradhya Singh',
  'Devika Shukla',
  'Dhairya Sahu',
  'Drishyan Gupta',
  'Hanzula Ahmad',
  'Hibba Khan',
  'Kushangi Kashyap',
  'Krishna Singh',
  'Lakshya Pandey',
  'Mohammad Hasan',
  'Mubashra Ahmad',
  'Poorvi Verma',
  'Radhya Bajpai',
  'Rajveer',
  'Riddhima Verma',
  'Rudrakshi Singh',
  'Shivansh Srivastava',
  'Vardaan',
  'Anushree Singh',
  'Ashwin Singh',
  'Gaurav Tiwari',
  'Prateek Singh',
  'Akshat Srivastava',
  'Aarav Vishwakarma',
  'Shaurya Upadhyay',
  'Ruchi Shukla',
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Using schoolId: ${SCHOOL_ID}, class: ${CLASS_LEVEL}${SECTION}`);

  // ── Sanity: confirm Shruti Yadav is the assigned class teacher ───────────
  const assignment = await ClassTeacherAssignment.findOne({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION,
  });
  if (assignment) {
    console.log(`Existing ClassTeacherAssignment for IV-B: teacherName="${assignment.teacherName}"`);
  } else {
    console.warn('  ! No ClassTeacherAssignment found for class IV, section B — proceeding anyway.');
  }

  // ── 1. Soft-delete existing IV-B roster ──────────────────────────────────
  const existing = await Student.find({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  });
  console.log(`\nExisting active students in IV-B: ${existing.length}`);

  const softDeleteResult = await Student.updateMany(
    { schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), deletedBy: 'replace-class-4b-roster script' },
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
    const admissionNumber = `ADM-4B-${ADMISSION_YEAR}-${String(rosterOrder).padStart(4, '0')}`;

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
      createdBy: 'replace-class-4b-roster script',
    });
    created++;
  }
  console.log(`\nNew students created: ${created}`);

  // ── 4. Sanity read-back ───────────────────────────────────────────────────
  const activeCount = await Student.countDocuments({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  });
  console.log(`\nActive students now in IV-B: ${activeCount}`);

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
