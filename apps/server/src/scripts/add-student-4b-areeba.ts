/**
 * Add a single new student, "Areeba", to Class IV / Section B
 * (class teacher: Shruti Yadav).
 *
 * Scope:
 *  - Appends to the end of the existing IV-B roster (rosterOrder = max + 1).
 *  - Recomputes alphabetical rollNumber for the full IV-B roster (including
 *    Areeba), matching the convention used by replace-class-4b-roster.ts.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/add-student-4b-areeba.ts
 *      (from apps/server)
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
const NEW_STUDENT_NAME = 'Areeba';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Using schoolId: ${SCHOOL_ID}, class: ${CLASS_LEVEL}${SECTION}`);

  const assignment = await ClassTeacherAssignment.findOne({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION,
  });
  if (assignment) {
    console.log(`Class teacher on file for IV-B: "${assignment.teacherName}"`);
  } else {
    console.warn('  ! No ClassTeacherAssignment found for class IV, section B.');
  }

  const existing = await Student.find({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  }).lean();
  console.log(`Existing active students in IV-B: ${existing.length}`);

  const maxRosterOrder = existing.reduce((max, s) => Math.max(max, s.rosterOrder ?? 0), 0);
  const rosterOrder = maxRosterOrder + 1;

  // Admission number: next free ADM-4B-<year>-#### slot.
  const usedSeqs = existing
    .map((s) => Number(s.admissionNumber?.match(/ADM-4B-\d+-(\d+)/)?.[1]))
    .filter((n) => !Number.isNaN(n));
  const nextSeq = (usedSeqs.length ? Math.max(...usedSeqs) : 0) + 1;
  const admissionNumber = `ADM-4B-${ADMISSION_YEAR}-${String(nextSeq).padStart(4, '0')}`;

  const created = await Student.create({
    fullName: NEW_STUDENT_NAME,
    admissionNumber,
    rosterOrder,
    class: CLASS_LEVEL,
    section: SECTION,
    admissionStatus: 'active',
    admissionYear: ADMISSION_YEAR,
    tags: [],
    schoolId: SCHOOL_ID,
    createdBy: 'add-student-4b-areeba script',
  });
  console.log(`\nCreated student: ${created.fullName} (admissionNumber=${created.admissionNumber}, rosterOrder=${created.rosterOrder})`);

  // ── Recompute alphabetical roll numbers for the full roster ─────────────
  const fullRoster = await Student.find({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  });
  const alphabetical = [...fullRoster].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' })
  );
  for (let i = 0; i < alphabetical.length; i++) {
    const rollNumber = String(i + 1);
    if (alphabetical[i].rollNumber !== rollNumber) {
      alphabetical[i].rollNumber = rollNumber;
      await alphabetical[i].save();
    }
  }
  console.log('Recomputed alphabetical roll numbers for full IV-B roster.');

  const sample = await Student.find({ schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false })
    .sort({ rosterOrder: 1 })
    .lean();
  console.log(`\nActive students now in IV-B: ${sample.length}`);
  sample.forEach((s) => console.log(`  ${s.rosterOrder}. ${s.fullName}  (roll ${s.rollNumber})`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
