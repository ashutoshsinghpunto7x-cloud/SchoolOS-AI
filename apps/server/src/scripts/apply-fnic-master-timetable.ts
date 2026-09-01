/**
 * One-off transcription of the principal's handwritten master timetable into
 * real FNIC (school_001) data — ONLY the cells that were legible with
 * confidence (see conversation this was built from). Everything illegible
 * (ambiguous "Harshita", Periods VI-VIII, a few other cells) is deliberately
 * left out, for the principal to fill in themselves via the School Timetable
 * page in the Principal dashboard.
 *
 * Writes through timetableService.setMasterGridCell — the same path the UI
 * uses — so conflict detection, audit logging, and the teacher-timetable
 * sync all run exactly as they would from a real cell edit.
 *
 * Run: npx tsx src/scripts/apply-fnic-master-timetable.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { timetableService } from '../features/timetable/timetable.service';
import { schoolClassRepository } from '../features/school-classes/school-class.repository';
import type { AuthContext } from '../lib/auth-context';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const ACADEMIC_YEAR = '2026-27';

const ctx: AuthContext = {
  userId: 'transcription-script',
  schoolId: SCHOOL_ID,
  displayName: 'Master Timetable Transcription',
  role: 'admin',
};

// Period name -> real PeriodSlot _id (from inspect-school001-timetable.ts)
const SLOT = {
  P1: '6a4fc31621fb0deaef1fa4c5',
  P2: '6a514ea4eb831539f6e49f10',
  P3: '6a5aa8cfb87ccd3d3cb738d1',
  P4: '6a5aa968b87ccd3d3cb738e7',
  P5: '6a5c1de4ce88dd96e1afafd3',
};

// Short name on the paper -> real Teacher record
const TEACHER = {
  SANDHYA:   { id: '6a597b1a3893ffcd0fd33708', name: 'MS. SANDHYA AWASTHI' },
  SHUKLA:    { id: '6a597b1a3893ffcd0fd33712', name: 'MS. HARSHITA SHUKLA' },
  SHRUTI:    { id: '6a597b1a3893ffcd0fd33718', name: 'MS. SHRUTI YADAV' },
  NIHARIKA:  { id: '6a597b1a3893ffcd0fd3370c', name: 'MS. NIHARIKA DIXIT' },
  ATEEQ:     { id: '6a597b193893ffcd0fd336ef', name: 'MR. ATEEQ-UR-REHMAN' },
  DEEPENDRA: { id: '6a597b193893ffcd0fd336eb', name: 'MR. DEEPENDRA MISHRA' },
  ANIS:      { id: '6a597b193893ffcd0fd336fb', name: 'MR. ANIS-UR-REHMAN' },
  NISHANT:   { id: '6a7c05bcb18f02f1b10d9058', name: 'Nishant Mishra' },
  SHIVANI:   { id: '6a69a68617a36586a5dc7865', name: 'Shivani Singh' },
};

interface Cell {
  class: string;
  section: string;
  slotId: string;
  subjectName: string;
  teacher: keyof typeof TEACHER;
}

// Only the cells legible with real confidence from the photo.
const CELLS: Cell[] = [
  // Period I
  { class: 'II',  section: 'A', slotId: SLOT.P1, subjectName: 'English',    teacher: 'SANDHYA' },
  { class: 'III', section: 'A', slotId: SLOT.P1, subjectName: 'English-I',  teacher: 'SHUKLA' },
  { class: 'IV',  section: 'B', slotId: SLOT.P1, subjectName: 'English-I',  teacher: 'SHRUTI' },
  { class: 'V',   section: 'A', slotId: SLOT.P1, subjectName: 'English',    teacher: 'NIHARIKA' },

  // Period II
  { class: 'II',  section: 'A', slotId: SLOT.P2, subjectName: 'Maths', teacher: 'SANDHYA' },
  { class: 'IV',  section: 'A', slotId: SLOT.P2, subjectName: 'Maths', teacher: 'SHUKLA' },
  { class: 'IV',  section: 'B', slotId: SLOT.P2, subjectName: 'Maths', teacher: 'DEEPENDRA' },
  { class: 'V',   section: 'A', slotId: SLOT.P2, subjectName: 'Maths', teacher: 'ATEEQ' },
  { class: 'V',   section: 'B', slotId: SLOT.P2, subjectName: 'Hindi', teacher: 'SHIVANI' },

  // Period III
  { class: 'II',  section: 'A', slotId: SLOT.P3, subjectName: 'Computer',      teacher: 'SHIVANI' },
  { class: 'III', section: 'A', slotId: SLOT.P3, subjectName: 'Maths',         teacher: 'SANDHYA' },
  { class: 'IV',  section: 'A', slotId: SLOT.P3, subjectName: 'Social Studies', teacher: 'NISHANT' },
  { class: 'V',   section: 'A', slotId: SLOT.P3, subjectName: 'Science',       teacher: 'ANIS' },

  // Period IV
  { class: 'II',  section: 'A', slotId: SLOT.P4, subjectName: 'EVS',           teacher: 'SHIVANI' },
  { class: 'III', section: 'A', slotId: SLOT.P4, subjectName: 'EVS',           teacher: 'NISHANT' },
  { class: 'IV',  section: 'A', slotId: SLOT.P4, subjectName: 'Science',       teacher: 'SHUKLA' },
  { class: 'V',   section: 'A', slotId: SLOT.P4, subjectName: 'Social Studies', teacher: 'NISHANT' },

  // Period V
  { class: 'III', section: 'A', slotId: SLOT.P5, subjectName: 'EVS',     teacher: 'SHIVANI' },
  { class: 'IV',  section: 'A', slotId: SLOT.P5, subjectName: 'English', teacher: 'NIHARIKA' },
  { class: 'IV',  section: 'B', slotId: SLOT.P5, subjectName: 'Science', teacher: 'SHRUTI' },
  { class: 'V',   section: 'B', slotId: SLOT.P5, subjectName: 'Science', teacher: 'SHUKLA' },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);

  // Class V currently only has section A on record — the paper has a 5-B
  // column too, so create that section before writing its cells.
  const classes = await schoolClassRepository.findAll(SCHOOL_ID);
  const classV = classes.find((c) => c.name === 'V');
  if (classV && !classV.sections.includes('B')) {
    await schoolClassRepository.addSection(classV._id.toString(), SCHOOL_ID, 'B', ctx.displayName);
    console.log('Added section B to Class V');
  }

  let ok = 0, failed = 0;
  for (const cell of CELLS) {
    const t = TEACHER[cell.teacher];
    try {
      await timetableService.setMasterGridCell(
        {
          class: cell.class,
          section: cell.section,
          academicYear: ACADEMIC_YEAR,
          slotId: cell.slotId,
          subjectName: cell.subjectName,
          teacherId: t.id,
          teacherName: t.name,
        },
        ctx,
      );
      console.log(`OK   ${cell.class}-${cell.section} @ ${cell.slotId.slice(-4)} -> ${cell.subjectName} / ${t.name}`);
      ok++;
    } catch (err) {
      console.error(`FAIL ${cell.class}-${cell.section} @ ${cell.slotId.slice(-4)} -> ${cell.subjectName} / ${t.name}:`, (err as Error).message);
      failed++;
    }
  }

  console.log(`\nDone. ${ok} cells written, ${failed} failed.`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
