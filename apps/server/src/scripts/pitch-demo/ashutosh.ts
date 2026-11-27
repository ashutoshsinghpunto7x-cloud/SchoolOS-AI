/**
 * Adds "Ashutosh Singh" (a real WhatsApp number, 9219583594) to the pitch demo
 * school, class 6A — Anjali Sharma's class — so a presenter can show:
 *   • Accountant (Arpit Gupta): collect his pending fee -> real receipt PDF on WhatsApp
 *   • Teacher (Anjali Sharma): he is marked ABSENT today -> "Send WhatsApp reminder"
 * Everything else in DEMO_SCHOOL is blocked from WhatsApp by whatsapp-test-gate.ts.
 *
 * Idempotent. Called at the end of seed-pitch-demo.ts, and also standalone
 * (npm run demo:ashutosh -w apps/server) to reset him on the morning of a demo
 * (puts the fee back to pending and today's attendance back to absent).
 */
import { Student } from '../../features/students/student.model';
import { Teacher } from '../../features/teachers/teacher.model';
import { Attendance } from '../../features/attendance/attendance.model';
import { FeeRecord } from '../../features/fees/fee.model';
import { FeePayment } from '../../features/fees/fee.payment.model';
import { NotificationLog } from '../../features/communication/notification-log.model';
import { SCHOOL_ID, ACADEMIC_YEAR, SEEDER, utc, iso, log } from './common';

const PHONE = '9219583594';
const ADMISSION = 'FNIC-2021-0101';
const CLASS = '6';
const SECTION = 'A';
const TUITION = 3200;

const todayIst = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export async function addAshutoshToDemo(): Promise<void> {
  // Remove the earlier throw-away test records (class 9W, ₹1 fee) if present.
  const stale = await Student.find({ schoolId: SCHOOL_ID, admissionNumber: 'DEMO-WA-0001' });
  for (const s of stale) {
    await FeePayment.deleteMany({ schoolId: SCHOOL_ID, studentId: s._id.toString() });
    await FeeRecord.deleteMany({ schoolId: SCHOOL_ID, studentId: s._id.toString() });
    await NotificationLog.deleteMany({ schoolId: SCHOOL_ID, studentId: s._id.toString() });
    await Attendance.deleteMany({ schoolId: SCHOOL_ID, studentId: s._id.toString() });
    await s.deleteOne();
  }

  const taken = await Student.find({ schoolId: SCHOOL_ID, class: CLASS, section: SECTION, isDeleted: false }).select('rollNumber');
  const nextRoll = String(Math.max(0, ...taken.map((t) => parseInt(t.rollNumber ?? '0', 10) || 0)) + 1);

  const student = await Student.findOneAndUpdate(
    { schoolId: SCHOOL_ID, admissionNumber: ADMISSION },
    {
      $set: {
        fullName: 'Ashutosh Singh', admissionNumber: ADMISSION, class: CLASS, section: SECTION, gender: 'male',
        dateOfBirth: utc(2015, 3, 14), fatherName: 'Ashutosh Singh', motherName: 'Sunita Singh', parentPhone: PHONE,
        address: '112, Gomti Nagar, Lucknow', admissionStatus: 'active', admissionYear: 2021, tags: [],
        monthlyTuitionFee: TUITION, schoolId: SCHOOL_ID, isDeleted: false,
      },
      $setOnInsert: { rollNumber: nextRoll, createdBy: SEEDER },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const studentId = student._id.toString();

  // Fees: November tuition (due, nothing paid) and December tuition upcoming. Reset to pending each run.
  await FeePayment.deleteMany({ schoolId: SCHOOL_ID, studentId });
  await FeeRecord.deleteMany({ schoolId: SCHOOL_ID, studentId });
  await NotificationLog.deleteMany({ schoolId: SCHOOL_ID, studentId });
  const common = {
    studentId, studentName: student.fullName, admissionNumber: ADMISSION, class: CLASS, section: SECTION, schoolId: SCHOOL_ID,
    feeHead: 'tuition', academicYear: ACADEMIC_YEAR, totalAmount: TUITION, discountAmount: 0, waivedAmount: 0, fineAmount: 0,
    paidAmount: 0, balance: TUITION, status: 'pending', createdBy: 'Arpit Gupta', isDeleted: false,
  };
  await FeeRecord.create([
    { ...common, description: 'November 2026 Tuition Fee', month: 'November', dueDate: utc(2026, 11, 30) },
    { ...common, description: 'December 2026 Tuition Fee', month: 'December', dueDate: utc(2026, 12, 10) },
  ]);

  // Attendance: present every school day since 1 Aug, ABSENT today (so the reminder can be shown).
  const teacher = await Teacher.findOne({ schoolId: SCHOOL_ID, email: 'demoteacher1@demo.schoolos.ai' });
  const markedBy = { markedById: teacher?._id.toString() ?? 'seed', markedByName: teacher?.fullName ?? 'Anjali Sharma' };
  const today = todayIst();
  await Attendance.deleteMany({ schoolId: SCHOOL_ID, studentId });
  const rows: Record<string, unknown>[] = [];
  const holidays = ['2026-08-15', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-09'];
  for (let d = utc(2026, 8, 1); iso(d) <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = iso(d);
    if (d.getUTCDay() === 0 || holidays.includes(date)) continue;
    rows.push({ studentId, schoolId: SCHOOL_ID, class: CLASS, section: SECTION, date, status: date === today ? 'absent' : 'present', ...markedBy, markedAt: new Date() });
  }
  if (!rows.some((r) => r.date === today)) {
    rows.push({ studentId, schoolId: SCHOOL_ID, class: CLASS, section: SECTION, date: today, status: 'absent', ...markedBy, markedAt: new Date() });
  }
  await Attendance.insertMany(rows, { ordered: false });
  log(`  Ashutosh Singh added to ${CLASS}${SECTION} (roll ${student.rollNumber}), absent on ${today}, Nov+Dec tuition pending`);
}
