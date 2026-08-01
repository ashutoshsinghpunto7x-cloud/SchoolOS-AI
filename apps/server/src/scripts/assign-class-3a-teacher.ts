/**
 * Link "Harshita Shukla" as the class teacher of Class 3, Section A via
 * ClassTeacherAssignment, so she's authorized to mark attendance for that
 * class (attendance.service.ts's assertTeacherCanMarkClass checks this).
 *
 * Run: npm run seed:assign-class-3a-teacher -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Teacher } from '../features/teachers/teacher.model';
import { ClassTeacherAssignment } from '../features/classes/class-teacher.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const CLASS_LEVEL = '3';
const SECTION = 'A';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);

  const teacher = await Teacher.findOne({
    schoolId: SCHOOL_ID,
    fullName: /harshita shukla/i,
    isDeleted: false,
  });

  if (!teacher) {
    throw new Error('No Teacher document found matching "Harshita Shukla" — aborting.');
  }
  console.log(`Found Teacher: ${teacher.fullName} (_id: ${teacher._id})`);

  const assignment = await ClassTeacherAssignment.findOneAndUpdate(
    { schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION },
    {
      schoolId: SCHOOL_ID,
      class: CLASS_LEVEL,
      section: SECTION,
      teacherId: teacher._id.toString(),
      teacherName: teacher.fullName,
      updatedBy: 'assign-class-3a-teacher script',
    },
    { upsert: true, new: true },
  );

  console.log(`ClassTeacherAssignment for 3A now: teacherName="${assignment.teacherName}", teacherId=${assignment.teacherId}`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
