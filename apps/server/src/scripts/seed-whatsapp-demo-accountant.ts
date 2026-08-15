/**
 * Adds ONE demo accountant login to the existing DEMO_SCHOOL sandbox, plus a
 * ₹500 pending tuition FeeRecord for each of the 3 WhatsApp-test students
 * seeded by seed-whatsapp-demo-class.ts (class 9W) — so that logging in as
 * this accountant and collecting one of those fees triggers the real
 * fee_payment_receipt WhatsApp template send (see
 * fee-receipt-notification.service.ts) against a real WhatsApp number
 * without any chance of touching a real student's parent.
 *
 * The accountant role is NOT scoped to specific students — it sees every
 * fee record in DEMO_SCHOOL (including the 6A–8A demo classes from
 * seed-demo-workspace.ts). Only the 3 class-9W students get a fee record
 * from this script, so they're the only ones with anything to collect.
 *
 * Additive/idempotent: upserts by email (User) and by
 * {schoolId,studentId,feeHead,academicYear} (FeeRecord) — never wipes the
 * rest of DEMO_SCHOOL. Requires seed-whatsapp-demo-class.ts to have been run
 * first (fails loudly if the 3 students aren't found).
 *
 * Run: npm run seed:whatsapp-demo-accountant -w apps/server
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

import { User } from '../features/users/user.model';
import { Student } from '../features/students/student.model';
import { FeeRecord } from '../features/fees/fee.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'DEMO_SCHOOL';
const PASSWORD = 'Demo@123';
const SALT_ROUNDS = 12; // Matches auth.service.ts so bcrypt.compare() succeeds at login.
const ACADEMIC_YEAR = '2026-27';

const DEMO_ACCOUNTANT = {
  email: 'demoaccountant.whatsapp@demo.schoolos.ai',
  username: 'demoaccountant-whatsapp',
  firstName: 'Receipt',
  lastName: 'Demo Accountant',
};

// Same 3 students seeded by seed-whatsapp-demo-class.ts, identified by the
// admissionNumber pattern that script used.
const FEE_ADMISSION_NUMBERS = ['DEMO-WA-0001', 'DEMO-WA-0002', 'DEMO-WA-0003'];
const FEE_AMOUNT = 500;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Adding WhatsApp demo accountant under schoolId: ${SCHOOL_ID}`);

  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // ── 1. Accountant login ─────────────────────────────────────────────────────
  await User.findOneAndUpdate(
    { email: DEMO_ACCOUNTANT.email },
    {
      firstName: DEMO_ACCOUNTANT.firstName,
      lastName: DEMO_ACCOUNTANT.lastName,
      email: DEMO_ACCOUNTANT.email,
      username: DEMO_ACCOUNTANT.username,
      passwordHash,
      role: 'accountant',
      schoolId: SCHOOL_ID,
      status: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`+ Accountant login ready: ${DEMO_ACCOUNTANT.email} / ${PASSWORD}`);

  // ── 2. ₹500 pending tuition fee for each of the 3 WhatsApp-test students ────
  let created = 0;
  for (const admissionNumber of FEE_ADMISSION_NUMBERS) {
    const student = await Student.findOne({ schoolId: SCHOOL_ID, admissionNumber, isDeleted: false });
    if (!student) {
      console.error(`! Student ${admissionNumber} not found — run "npm run seed:whatsapp-demo -w apps/server" first.`);
      continue;
    }

    await FeeRecord.findOneAndUpdate(
      { schoolId: SCHOOL_ID, studentId: student._id.toString(), feeHead: 'tuition', academicYear: ACADEMIC_YEAR, isDeleted: false },
      {
        studentId: student._id.toString(),
        studentName: student.fullName,
        admissionNumber: student.admissionNumber,
        class: student.class,
        section: student.section,
        schoolId: SCHOOL_ID,
        feeHead: 'tuition',
        description: 'WhatsApp receipt test — Tuition Fee',
        academicYear: ACADEMIC_YEAR,
        totalAmount: FEE_AMOUNT,
        discountAmount: 0,
        waivedAmount: 0,
        fineAmount: 0,
        paidAmount: 0,
        balance: FEE_AMOUNT,
        dueDate: new Date(),
        status: 'pending',
        createdBy: 'seed-whatsapp-demo-accountant script',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    created++;
    console.log(`+ Fee record ready: ${student.fullName} (${admissionNumber}) — ₹${FEE_AMOUNT} tuition, parentPhone ${student.parentPhone}`);
  }

  console.log('\n=== WhatsApp receipt test login ===');
  console.log(`  ${DEMO_ACCOUNTANT.email}  (or username "${DEMO_ACCOUNTANT.username}")  /  ${PASSWORD}`);
  console.log(`  Fee records created/verified: ${created}/${FEE_ADMISSION_NUMBERS.length}`);
  console.log('  Go to Fees -> find one of these students -> Collect Payment -> full ₹500 -> the fee_payment_receipt WhatsApp template fires automatically.');

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
