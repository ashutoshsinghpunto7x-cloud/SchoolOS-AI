import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Student } from '../features/students/student.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const uri = process.env.MONGODB_URI!;
  await mongoose.connect(uri);
  const students = await Student.find({ schoolId: 'school_001', class: 'V', section: 'A', isDeleted: false })
    .sort({ rosterOrder: 1 }).lean();
  students.forEach((s) => console.log(`${s.rosterOrder}\t${s.fullName}\t${s._id}`));
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
