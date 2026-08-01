/**
 * One-off cleanup: mark PerformanceTestRun docs stuck at status 'running' as
 * 'failed'. These are orphaned records left behind by the missing
 * child.on('error') handler in performance-test.runner.ts (fixed alongside
 * this script) — when k6 wasn't installed on the server, spawn() crashed the
 * process before the run could ever be finalized, leaving the DB row stuck.
 *
 * Run: npm run cleanup:stuck-perf-tests -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { PerformanceTestRun } from '../features/performance-testing/performance-test.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);

  const stuck = await PerformanceTestRun.find({ status: 'running' });
  console.log(`Found ${stuck.length} run(s) stuck at status 'running'.`);

  const result = await PerformanceTestRun.updateMany(
    { status: 'running' },
    {
      status: 'failed',
      stage: 'completed',
      endedAt: new Date(),
      failureReason: 'Orphaned run: server process crashed while starting k6 (missing error handler, since fixed).',
    },
  );
  console.log(`Marked ${result.modifiedCount} run(s) as failed.`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
