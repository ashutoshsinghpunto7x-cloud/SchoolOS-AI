/**
 * One-off: removes three low-value rows from "Personal, Social and Work Habits" on every
 * report-card template (the space now holds the single Behaviour Remark box).
 * Cards already generated keep stale entries for these rows; the card renderer filters
 * them out, and a regenerate drops them.
 *
 * Dry run by default. Run: npx tsx src/scripts/remove-habit-rows-from-templates.ts [--apply]
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ReportCardTemplate } from '../features/report-card-templates/report-card-template.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REMOVE = ['Takes interest in class activities', 'Is co-operative', 'Cares for personal and school property'].map((s) => s.toLowerCase());
const APPLY = process.argv.includes('--apply');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log(APPLY ? 'APPLY MODE' : 'DRY RUN');
  for (const t of await ReportCardTemplate.find({ schoolId: 'school_001' })) {
    let removed = 0;
    for (const sec of t.skillSections) {
      if (!/habits/i.test(sec.name)) continue;
      const keep = sec.rows.filter((r) => !REMOVE.includes(r.label.trim().toLowerCase()));
      removed += sec.rows.length - keep.length;
      keep.forEach((r, i) => { r.order = i; });
      sec.rows = keep;
    }
    if (removed === 0) continue;
    console.log(`${t.schoolId} ${t.class} ${t.academicYear}: -${removed} rows`);
    if (APPLY) { t.markModified('skillSections'); await t.save(); }
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
