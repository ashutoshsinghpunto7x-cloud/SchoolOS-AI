/**
 * Seeds 100 teacher accounts (teacher001@schoolos.ai .. teacher100@schoolos.ai) for
 * Artillery load testing against POST /api/v1/auth/login. Idempotent — re-running
 * skips any email that already exists. Also writes performance-testing/teachers.csv
 * (email,password) for Artillery's CSV payload loader.
 *
 * Uses the real `User` Mongoose model (not a raw collection insert) so the seeded
 * documents go through the exact same schema/required-field shape the login flow
 * reads — passwordHash is bcrypt-hashed with the same SALT_ROUNDS as auth.service.ts.
 *
 * Run: npm run seed:teachers -w apps/server
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { User } from '../features/users/user.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TEACHER_COUNT = 100;
const PASSWORD = 'Test@123';
const SALT_ROUNDS = 12; // Matches auth.service.ts so bcrypt.compare() succeeds at login.
const CSV_PATH = path.resolve(__dirname, '../../../../performance-testing/teachers.csv');

const emailFor = (n: number) => `teacher${String(n).padStart(3, '0')}@schoolos.ai`;

async function resolveSchoolId(): Promise<string> {
  // Reuse whatever schoolId the existing data already uses, so seeded teachers
  // behave like real tenants of this school rather than an unrelated fake one.
  const existing = await User.findOne({ deletedAt: { $exists: false } }).sort({ createdAt: 1 }).lean();
  if (existing?.schoolId) return existing.schoolId;
  return 'school_001'; // Falls back to the same default seed-admin.ts uses.
}

async function seedTeachers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const schoolId = await resolveSchoolId();
  console.log(`Using schoolId: ${schoolId}`);

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= TEACHER_COUNT; i++) {
    const email = emailFor(i);
    const existing = await User.findOne({ email });
    if (existing) {
      skipped++;
      continue;
    }

    await User.create({
      firstName: 'Teacher',
      lastName: String(i).padStart(3, '0'),
      email,
      passwordHash,
      role: 'teacher',
      schoolId,
      status: 'active',
    });
    created++;
  }

  console.log(`✓ Teachers created: ${created}`);
  console.log(`  Already existed (skipped): ${skipped}`);
  console.log(`  Total teacher accounts available: ${created + skipped}`);

  // Always (re)write the CSV so it reflects the full set of 100, even on a re-run
  // where every account already existed.
  const rows = ['email,password', ...Array.from({ length: TEACHER_COUNT }, (_, idx) => `${emailFor(idx + 1)},${PASSWORD}`)];
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  fs.writeFileSync(CSV_PATH, rows.join('\n') + '\n', 'utf8');
  console.log(`✓ CSV written: ${CSV_PATH}`);

  await mongoose.disconnect();
}

seedTeachers().catch((err) => { console.error(err); process.exit(1); });
