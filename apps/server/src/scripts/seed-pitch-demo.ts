/**
 * Pitch-demo seed: a complete, fully populated demo school for presentations.
 * Every dashboard (principal, incharge, admin, 5 teachers, accountant,
 * reception, operations manager, academic coordinator, 2 parents, 2 drivers)
 * gets a login and real-looking data in every module.
 *
 * Isolation: everything is scoped to schoolId = 'DEMO_SCHOOL'. This script
 * wipes and rebuilds ONLY that tenant — it never touches 'school_001' (FNIC)
 * or any other school. Idempotent; a seeded PRNG keeps the numbers stable.
 *
 * Run: npm run seed:pitch-demo -w apps/server
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';

// This machine's default resolver refuses SRV lookups (mongodb+srv://); public DNS answers them.
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { SCHOOL_ID, PASSWORD, SCHOOL_NAME, TEACHERS, STAFF, PARENTS, log } from './pitch-demo/common';
import { seedCore } from './pitch-demo/core';
import { seedAcademics } from './pitch-demo/academics';
import { seedFinance } from './pitch-demo/finance-ops';
import { seedFrontOffice } from './pitch-demo/front-office';
import { addReliefTeachers, RELIEF_LOGIN } from './pitch-demo/relief-teachers';

async function wipe(): Promise<void> {
  if (SCHOOL_ID !== 'DEMO_SCHOOL') throw new Error('Refusing to wipe a non-demo tenant');
  const names = mongoose.modelNames();
  const skip = new Set(['SchoolSettings']); // handled by upsert
  let removed = 0;
  for (const name of names) {
    if (skip.has(name)) continue;
    const model = mongoose.model(name);
    if (!model.schema.path('schoolId')) continue;
    const res = await model.deleteMany({ schoolId: SCHOOL_ID });
    removed += res.deletedCount ?? 0;
  }
  log(`  wiped ${removed} existing DEMO_SCHOOL documents`);
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  log(`Connected. Building pitch demo school "${SCHOOL_NAME}" (${SCHOOL_ID})`);

  // Import every model once so mongoose.modelNames() is complete before the wipe.
  await Promise.all([
    import('../features/users/user.model'), import('../features/audit/audit.model'),
  ]);

  log('\n[0] Wipe');
  await wipe();
  log('\n[1] Core: school, people, timetable, students, attendance');
  const world = await seedCore();
  log('\n[2] Academics: exams, marks, report cards, syllabus, plans, question bank, mock tests');
  await seedAcademics(world);
  log('\n[3] Finance + Operations');
  await seedFinance(world);
  log('\n[4] Front office, approvals, messaging, transport');
  await seedFrontOffice(world);
  log('\n[5] Activity teachers with free periods (substitute suggestions)');
  await addReliefTeachers();

  const rows: string[] = [];
  rows.push(`| Dashboard | Email | Username | Password |`);
  rows.push(`|---|---|---|---|`);
  for (const s of STAFF) rows.push(`| ${s.dashboard} | ${s.email} | ${s.username} | ${PASSWORD} |`);
  for (const t of TEACHERS) rows.push(`| Teacher — ${t.subject} (class teacher of ${t.classTeacherOf.cls}${t.classTeacherOf.section}) | ${t.email} | ${t.username} | ${PASSWORD} |`);
  rows.push(`| Teacher — Art & Craft (has free periods) | ${RELIEF_LOGIN.email} | ${RELIEF_LOGIN.username} | ${PASSWORD} |`);
  for (const p of PARENTS) rows.push(`| Parent (${p.childIdx.length} child${p.childIdx.length > 1 ? 'ren' : ''}) | ${p.email} | ${p.username} | ${PASSWORD} |`);

  const docPath = path.resolve(__dirname, '../../../../docs/Pitch_Demo_Logins.md');
  fs.writeFileSync(docPath, `# SchoolOS — Pitch Demo Logins\n\nSchool: **${SCHOOL_NAME}** (tenant \`${SCHOOL_ID}\`, isolated from real school data)\n\n${rows.join('\n')}\n`);

  console.log('\n=== Demo logins (password for all: ' + PASSWORD + ') ===');
  for (const r of rows.slice(2)) console.log(r);
  log(`\nCredentials written to ${docPath}`);
  await mongoose.disconnect();
  log('Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
