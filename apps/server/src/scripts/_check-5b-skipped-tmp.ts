/**
 * Read-only. Prints the most recent ATTENDANCE_ABSENT bulk-notification batch
 * and lists every SKIPPED recipient with the reason, so we can see who didn't
 * get the WhatsApp reminder and why. No writes.
 *
 * Run: npx tsx src/scripts/_check-5b-skipped-tmp.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { NotificationLog } from '../features/communication/notification-log.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const SCHOOL_ID = 'school_001';

  const latest = await NotificationLog.findOne(
    { schoolId: SCHOOL_ID, notificationType: 'ATTENDANCE_ABSENT' },
  ).sort({ createdAt: -1 }).lean();

  if (!latest) { console.log('No ATTENDANCE_ABSENT notifications found.'); await mongoose.disconnect(); return; }

  console.log(`Latest bulkJobId: ${latest.bulkJobId}, createdAt: ${latest.createdAt}`);

  const batch = await NotificationLog.find({ schoolId: SCHOOL_ID, bulkJobId: latest.bulkJobId }).lean();
  console.log(`\nTotal in batch: ${batch.length}`);
  const byStatus: Record<string, number> = {};
  for (const r of batch) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log('By status:', byStatus);

  console.log('\nSKIPPED / FAILED recipients:');
  batch
    .filter((r) => r.status === 'SKIPPED' || r.status === 'FAILED')
    .forEach((r) => console.log(`  - ${r.recipientName} (studentId ${r.studentId}) — ${r.status}: ${r.errorMessage}`));

  console.log('\nSENT recipients:');
  batch
    .filter((r) => r.status === 'SENT')
    .forEach((r) => console.log(`  - ${r.recipientName} → ${r.phoneNumber}`));

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
