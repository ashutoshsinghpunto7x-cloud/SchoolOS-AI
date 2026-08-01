/**
 * Replace the Class 3 / Section A student roster with the real, up-to-date
 * list of 46 students provided by the class teacher (Harshita Shukla).
 *
 * Scope:
 *  - Soft-deletes existing Student docs for schoolId 'school_001', class '3',
 *    section 'A' (isDeleted: true) — reversible, and keeps any historical
 *    Attendance/FeeRecord rows referencing their studentId intact.
 *  - Creates 46 new active Student docs for class 3A with rollNumber 1-46
 *    (matching the order of the provided list) and a distinct admission
 *    number prefix (ADM-3A-<year>-####) that can't collide with the general
 *    ADM-<year>-#### numbering used elsewhere.
 *  - Only names were provided — gender, DOB, parent contact, etc. are left
 *    unset and can be filled in later via the Student Directory.
 *
 * Does NOT touch any other class/section, Attendance, or FeeRecord data.
 *
 * Run: npm run seed:replace-class-3a -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Student } from '../features/students/student.model';
import { Teacher } from '../features/teachers/teacher.model';
import { ClassTeacherAssignment } from '../features/classes/class-teacher.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const CLASS_LEVEL = '3';
const SECTION = 'A';
const ADMISSION_YEAR = new Date().getFullYear();

// Order matches the provided roster photo (roll numbers 1-46).
const STUDENT_NAMES = [
  'Aaradhya Pandey', 'Aarna Singh', 'Abhay Tiwari', 'Abhinav Gupta',
  'Abhishek Awasthi', 'Adina Adnan', 'Ambar', 'Anaisha Edward Lakra',
  'Ananya Gupta', 'Ananya Sonker', 'Ansh Mishra', 'Anya Dwivedi',
  'Aradhya Gupta', 'Arni Rastogi', 'Arush Singh', 'Aryan Saxena',
  'Atharv Mukherjee', 'Athrav Tripathi', 'Avika Verma', 'Aviral Kumar',
  'Avisha Jauhari', 'Ayush Vishvakarma', 'Chirag Sagar', 'Devansh Tripathi',
  'Dharna Singh Rawat', 'Farhan Ahmad', 'Kartik Teotia', 'Kushagra Singh',
  'Meeza Shoeb Khan', 'Mohd Hammad Zeeshan', 'Naitik Jaiswal', 'Numair Ahmed',
  'Om Tiwari', 'Prabhav Mishra', 'Rudra Tiwari', 'Rudraksh Rajpoot',
  'Shivansh Sharma', 'Shivika Kashyap', 'Smriti Kashyap', 'Soumya Mishra',
  'Trisha Roy', 'Vanshika Gupta', 'Vidhi Gupta', 'Vihaan Pandey',
  'Vinayak Kumar', 'Yash Patel',
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Using schoolId: ${SCHOOL_ID}, class: ${CLASS_LEVEL}${SECTION}`);

  // ── Sanity: confirm Harshita Shukla is the assigned class teacher ────────
  const teacher = await Teacher.findOne({
    schoolId: SCHOOL_ID,
    fullName: /harshita shukla/i,
    isDeleted: false,
  });
  const assignment = await ClassTeacherAssignment.findOne({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION,
  });

  if (teacher) {
    console.log(`Found Teacher: ${teacher.fullName} (_id: ${teacher._id})`);
  } else {
    console.warn('  ! No Teacher document matching "Harshita Shukla" found — proceeding anyway.');
  }
  if (assignment) {
    const match = teacher && assignment.teacherId === teacher._id.toString();
    console.log(`Existing ClassTeacherAssignment for 3A: teacherName="${assignment.teacherName}" (${match ? 'matches' : 'DOES NOT MATCH'} Harshita Shukla record)`);
  } else {
    console.warn('  ! No ClassTeacherAssignment found for class 3, section A.');
  }

  // ── 1. Soft-delete existing 3A roster ────────────────────────────────────
  const existing = await Student.find({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  });
  console.log(`\nExisting active students in 3A: ${existing.length}`);

  const softDeleteResult = await Student.updateMany(
    { schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false },
    { isDeleted: true, deletedAt: new Date(), deletedBy: 'replace-class-3a-roster script' },
  );
  console.log(`Soft-deleted: ${softDeleteResult.modifiedCount}`);

  // ── 2. Create the new roster ─────────────────────────────────────────────
  let created = 0;
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const fullName = STUDENT_NAMES[i];
    const rollNumber = String(i + 1);
    const admissionNumber = `ADM-3A-${ADMISSION_YEAR}-${String(i + 1).padStart(4, '0')}`;

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
      createdBy: 'replace-class-3a-roster script',
    });
    created++;
  }
  console.log(`\nNew students created: ${created}`);

  // ── 3. Sanity read-back ──────────────────────────────────────────────────
  const activeCount = await Student.countDocuments({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  });
  console.log(`\nActive students now in 3A: ${activeCount}`);

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
