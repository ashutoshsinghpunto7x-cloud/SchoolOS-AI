/**
 * Adds the substitute-friendly activity teachers to an already-seeded demo
 * school, without wiping anything.
 *
 * Run: npx tsx src/scripts/add-demo-relief-teachers.ts   (from apps/server)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

// This machine's default resolver refuses SRV lookups (mongodb+srv://); public DNS answers them.
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { addReliefTeachers } from './pitch-demo/relief-teachers';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
  await addReliefTeachers();
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
