/**
 * Replace the Class IV / Section A student roster with the list provided by
 * the class teacher (Shivani Singh).
 *
 * Scope:
 *  - Auto-detects the class-label convention already used for grade 4 in
 *    this DB (sibling class IV-B uses "IV") — reuses whatever label already
 *    has active IV-A students, falling back to "IV" if none exist.
 *  - Soft-deletes existing Student docs for schoolId 'school_001', section
 *    'A' under that class label (isDeleted: true) — reversible, keeps
 *    historical Attendance/FeeRecord rows referencing their studentId intact.
 *    Does NOT hard-delete anything.
 *  - Creates new active Student docs for class IV-A with:
 *      - rosterOrder = position in the list AS GIVEN (1..N) — default
 *        display order; names are NOT alphabetized for the default view.
 *      - rollNumber  = alphabetical rank (1..N) — used only when the
 *        "sort by roll number" filter is switched on.
 *  - Only names were provided — other fields are left unset.
 *  - Upserts the ClassTeacherAssignment for IV-A to "Shivani Singh" (looked
 *    up by case-insensitive fullName match against active Teacher docs) so
 *    she's authorized to mark attendance for this class. Aborts before
 *    touching any student data if no matching Teacher record is found.
 *
 * Run: npm run seed:replace-class-4a -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Student } from '../features/students/student.model';
import { ClassTeacherAssignment } from '../features/classes/class-teacher.model';
import { Teacher } from '../features/teachers/teacher.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const SECTION = 'A';
const ADMISSION_YEAR = new Date().getFullYear();
const CLASS_LABEL_CANDIDATES = ['IV', '4'];

// Order matches exactly what the class teacher provided — do NOT reorder.
const STUDENT_NAMES = [
  'Aadi Verma',
  'Aayush Kumar',
  'Abhay Kumar Bajpai',
  'Aditya Mishra',
  'Adyansh Singh',
  'Akshat Dixit',
  'Akshat Shukla',
  'Anshika Kharwar',
  'Aparna Gupta',
  'Aradhya Saxena',
  'Arya Laxmi Verma',
  'Ashu Mishra',
  'Ayaan Srivastava',
  'Jhanvi Sonkar',
  'Kamakshi Gupta',
  'Kavya Yadav',
  'Krishna Chaurasiya',
  'Lakshika Nigam',
  'Prakhar Srivastava',
  'Rita Ansari',
  'Astha Mishra',
  'Samridhi Singh',
  'Sanskar Bharti',
  'Shaurya Pal',
  'Shivangi',
  'Shreyansh Sharma',
  'Shreyanshi Bajpai',
  'Tanisha Mishra',
  'Umra Bano',
  'Vartika Chaurasiya',
  'Alayza Fatima',
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. schoolId: ${SCHOOL_ID}, section: ${SECTION}`);

  // ── 0. Find the class teacher FIRST — abort before touching students if missing ──
  const teacher = await Teacher.findOne({
    schoolId: SCHOOL_ID,
    fullName: /shivani singh/i,
    isDeleted: false,
  });
  if (!teacher) {
    throw new Error('No active Teacher document found matching "Shivani Singh" — aborting before any student data is touched.');
  }
  console.log(`Found Teacher: ${teacher.fullName} (_id: ${teacher._id})`);

  // ── 0b. Detect which class label ("IV" vs "4") already holds IV-A data ──
  let classLevel = CLASS_LABEL_CANDIDATES[0];
  for (const candidate of CLASS_LABEL_CANDIDATES) {
    const count = await Student.countDocuments({
      schoolId: SCHOOL_ID, class: candidate, section: SECTION, isDeleted: false,
    });
    console.log(`  class="${candidate}" section="A": ${count} active students`);
    if (count > 0) { classLevel = candidate; break; }
  }
  console.log(`Using class label: "${classLevel}"`);

  // ── 1. Soft-delete existing IV-A roster ──────────────────────────────────
  const existing = await Student.find({
    schoolId: SCHOOL_ID, class: classLevel, section: SECTION, isDeleted: false,
  });
  console.log(`\nExisting active students in ${classLevel}-A (${existing.length}):`);
  existing.forEach((s) => console.log(`  - ${s.fullName}`));

  const softDeleteResult = await Student.updateMany(
    { schoolId: SCHOOL_ID, class: classLevel, section: SECTION, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), deletedBy: 'replace-class-4a-roster script' },
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
    const admissionNumber = `ADM-4A-${ADMISSION_YEAR}-${String(rosterOrder).padStart(4, '0')}`;

    await Student.create({
      fullName,
      admissionNumber,
      rollNumber,
      rosterOrder,
      class: classLevel,
      section: SECTION,
      admissionStatus: 'active',
      admissionYear: ADMISSION_YEAR,
      tags: [],
      schoolId: SCHOOL_ID,
      createdBy: 'replace-class-4a-roster script',
    });
    created++;
  }
  console.log(`\nNew students created: ${created}`);

  // ── 4. Upsert ClassTeacherAssignment for IV-A → Shivani Singh ───────────
  const assignment = await ClassTeacherAssignment.findOneAndUpdate(
    { schoolId: SCHOOL_ID, class: classLevel, section: SECTION },
    {
      schoolId: SCHOOL_ID,
      class: classLevel,
      section: SECTION,
      teacherId: teacher._id.toString(),
      teacherName: teacher.fullName,
      updatedBy: 'replace-class-4a-roster script',
    },
    { upsert: true, new: true },
  );
  console.log(`ClassTeacherAssignment for ${classLevel}-A now: teacherName="${assignment.teacherName}", teacherId=${assignment.teacherId}`);

  // ── 5. Sanity read-back ───────────────────────────────────────────────────
  const activeCount = await Student.countDocuments({
    schoolId: SCHOOL_ID, class: classLevel, section: SECTION, isDeleted: false,
  });
  console.log(`\nActive students now in ${classLevel}-A: ${activeCount}`);

  const sample = await Student.find({ schoolId: SCHOOL_ID, class: classLevel, section: SECTION, isDeleted: false })
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
