/**
 * Cleanup follow-up to replace-class-2-roster.ts: removes the now-empty
 * "B" section from the SchoolClass config doc for Class II (school_001),
 * so it stops appearing as a pickable option in attendance/admissions/
 * fees/import dropdowns. Confirmed 0 active students remain in section B
 * before running this.
 *
 * Run: npx tsx src/scripts/remove-class-2-section-b.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { SchoolClass } from '../features/school-classes/school-class.model';
import { Student } from '../features/students/student.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const CLASS_LEVEL = 'II';
const SECTION = 'B';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);

  const activeInB = await Student.countDocuments({
    schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false,
  });
  if (activeInB > 0) {
    console.error(`Refusing to remove section B: ${activeInB} active students still assigned to it.`);
    process.exit(1);
  }

  const before = await SchoolClass.findOne({ schoolId: SCHOOL_ID, name: CLASS_LEVEL });
  console.log('Before:', before?.sections);

  const updated = await SchoolClass.findOneAndUpdate(
    { schoolId: SCHOOL_ID, name: CLASS_LEVEL },
    { $pull: { sections: SECTION }, $set: { updatedBy: 'remove-class-2-section-b script' } },
    { new: true },
  );
  console.log('After:', updated?.sections);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
