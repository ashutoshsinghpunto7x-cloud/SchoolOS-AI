/**
 * Adds the demo teacher's exam papers and worksheets to DEMO_SCHOOL without
 * re-running the full pitch-demo seed. Safe to run more than once.
 *
 * Run: npx tsx src/scripts/add-demo-exam-papers.ts   (from apps/server)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { addExamPapersAndWorksheets } from './pitch-demo/exam-papers';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  await addExamPapersAndWorksheets();
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
