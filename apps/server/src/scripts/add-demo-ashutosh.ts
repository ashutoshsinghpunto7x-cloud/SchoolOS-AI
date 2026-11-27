/** Run: npm run demo:ashutosh -w apps/server  — (re)adds Ashutosh Singh to the pitch demo (see pitch-demo/ashutosh.ts). */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { addAshutoshToDemo } from './pitch-demo/ashutosh';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  await addAshutoshToDemo();
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
