/**
 * One-off, non-destructive seed for smoke-testing the Operations &
 * Administration Dashboard (Phase 1): one `operations_manager` login, one
 * Employee record to use as a Purchase Request's "raised by", and one active
 * Vendor to issue a Purchase Order against — all scoped to schoolId =
 * DEMO_SCHOOL, upserted (safe to re-run), and additive only (never deletes
 * anything, unlike seed-demo-workspace.ts).
 *
 * Run: npx tsx src/scripts/seed-operations-demo.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

import { User } from '../features/users/user.model';
import { Employee } from '../features/employees/employee.model';
import { Vendor } from '../features/vendors/vendor.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'DEMO_SCHOOL';
const PASSWORD = 'Demo@123';
const SALT_ROUNDS = 12;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected. Seeding Operations demo data under schoolId: ${SCHOOL_ID}`);

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  const opsUser = await User.findOneAndUpdate(
    { email: 'demoops@demo.schoolos.ai' },
    {
      firstName: 'Rakesh',
      lastName: 'Malhotra',
      email: 'demoops@demo.schoolos.ai',
      username: 'demoops',
      passwordHash,
      role: 'operations_manager',
      schoolId: SCHOOL_ID,
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`+ Operations Manager login ready: demoops@demo.schoolos.ai / ${PASSWORD}`);

  // Phase 2 (Asset Tracking + Facility Maintenance): Accountant can raise
  // facility requests but not triage them — this login exercises that split.
  const accountantUser = await User.findOneAndUpdate(
    { email: 'demoopsaccountant@demo.schoolos.ai' },
    {
      firstName: 'Neha',
      lastName: 'Kapoor',
      email: 'demoopsaccountant@demo.schoolos.ai',
      username: 'demoopsaccountant',
      passwordHash,
      role: 'accountant',
      schoolId: SCHOOL_ID,
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`+ Accountant login ready: demoopsaccountant@demo.schoolos.ai / ${PASSWORD}`);

  let employee = await Employee.findOne({ schoolId: SCHOOL_ID, email: 'demoopsemployee@demo.schoolos.ai' });
  if (!employee) {
    employee = await Employee.create({
      schoolId: SCHOOL_ID,
      employeeId: 'DEMO-EMP-OPS-001',
      fullName: 'Sunita Bhatia',
      gender: 'female',
      designation: 'Lab Assistant',
      department: 'Physics',
      email: 'demoopsemployee@demo.schoolos.ai',
      phone: '9800000001',
      employmentType: 'full_time',
      role: 'other',
      status: 'active',
      createdBy: 'seed-operations-demo script',
    });
  }
  console.log(`+ Employee ready: ${employee.fullName} (${employee._id}) — used as Purchase Request "raised by"`);

  let vendor = await Vendor.findOne({ schoolId: SCHOOL_ID, name: 'Demo Lab Supplies Co.' });
  if (!vendor) {
    vendor = await Vendor.create({
      schoolId: SCHOOL_ID,
      name: 'Demo Lab Supplies Co.',
      category: 'supplies',
      status: 'active',
      contactPerson: 'Manoj Gupta',
      phone: '9800000002',
      email: 'demovendor@demo.schoolos.ai',
      gstNumber: '07DEMO1234A1Z5',
      createdBy: 'seed-operations-demo script',
    });
  }
  console.log(`+ Vendor ready: ${vendor.name} (${vendor._id})`);

  console.log('\n=== Ready for the Operations workflow ===');
  console.log(`  Login:    demoops@demo.schoolos.ai / ${PASSWORD}  (operations_manager)`);
  console.log(`  Login:    demoopsaccountant@demo.schoolos.ai / ${PASSWORD}  (accountant)`);
  console.log(`  Employee: ${employee._id} (${employee.fullName})`);
  console.log(`  Vendor:   ${vendor._id} (${vendor.name})`);
  console.log(`  User _id (ops): ${opsUser!._id}`);
  console.log(`  User _id (accountant): ${accountantUser!._id}`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
