/**
 * Read-only reconnaissance before transcribing the handwritten master
 * timetable into school_001's real data — lists existing classes, period
 * slots, teachers, and any existing Timetable docs so we know what already
 * exists before writing anything.
 *
 * Run: npx tsx src/scripts/inspect-school001-timetable.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { SchoolClass } from '../features/school-classes/school-class.model';
import { PeriodSlot } from '../features/timetable/timetable.period.model';
import { Teacher } from '../features/teachers/teacher.model';
import { Timetable } from '../features/timetable/timetable.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);

  const classes = await SchoolClass.find({ schoolId: SCHOOL_ID }).sort({ name: 1 }).lean();
  console.log('\n=== SchoolClass ===');
  for (const c of classes) console.log(`${c.name}\t sections: [${c.sections.join(', ')}]`);

  const periods = await PeriodSlot.find({ schoolId: SCHOOL_ID, isDeleted: false }).sort({ orderIndex: 1 }).lean();
  console.log('\n=== PeriodSlot ===');
  for (const p of periods) console.log(`${p.orderIndex}\t${p.name}\t${p.startTime}-${p.endTime}\tbreak=${p.isBreak}\tdays=[${p.daysApplicable.join(',')}]\t_id=${p._id}`);

  const teachers = await Teacher.find({ schoolId: SCHOOL_ID, isDeleted: false }).sort({ fullName: 1 }).lean();
  console.log('\n=== Teacher ===');
  for (const t of teachers) console.log(`${t.fullName}\t_id=${t._id}`);

  const timetables = await Timetable.find({ schoolId: SCHOOL_ID, isDeleted: false }).lean();
  console.log('\n=== Timetable ===');
  for (const tt of timetables) console.log(`${tt.class}-${tt.section}\t${tt.academicYear}\t${tt.term ?? ''}\t${tt.status}\tentries=${tt.entries.length}\t_id=${tt._id}`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
