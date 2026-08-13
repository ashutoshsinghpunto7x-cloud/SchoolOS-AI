/**
 * One-off spelling corrections for Class V / Section A students, as provided
 * by the class teacher. Only `fullName` is touched — no other fields.
 *
 * Run: npx ts-node src/scripts/fix-5a-spellings.ts   (from apps/server)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Student } from '../features/students/student.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const CLASS_LEVEL = 'V';
const SECTION = 'A';

// old (as currently stored) -> new (corrected spelling)
const CORRECTIONS: [string, string][] = [
  ['Aditoi Tiwari', 'Aditri Tiwari'],
  ['Aryam Sharma', 'Aryan Sharma'],
  ['Baoumi Awasthi', 'Baruni Awasthi'],
  ['Divyansh Senker', 'Divyansh Sonkar'],
  ['Faizam Ahmad', 'Faizan Ahmad'],
  ['Rudra Kamnaujjiya', 'Rudra Kannaujiya'],
  ['Saraa Sahu', 'Saras Sahu'],
  ['Shabrat Singh', 'Shashwat Singh'],
  ['Shaurya Upadhyay', 'Shourya Upadhyay'],
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected. Fixing spellings in class ${CLASS_LEVEL}${SECTION}, schoolId ${SCHOOL_ID}\n`);

  for (const [oldName, newName] of CORRECTIONS) {
    const doc = await Student.findOne({
      schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false, fullName: oldName,
    });
    if (!doc) {
      console.warn(`  ! Not found: "${oldName}" — skipped`);
      continue;
    }
    doc.fullName = newName;
    doc.updatedBy = 'fix-5a-spellings script';
    await doc.save();
    console.log(`  "${oldName}" -> "${newName}"`);
  }

  console.log('\nDone. Current V-A roster:');
  const roster = await Student.find({ schoolId: SCHOOL_ID, class: CLASS_LEVEL, section: SECTION, isDeleted: false })
    .sort({ rosterOrder: 1 }).lean();
  roster.forEach((s) => console.log(`  ${s.rosterOrder}. ${s.fullName}`));

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
