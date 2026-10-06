/**
 * One-off: gives every FNIC (school_001) class the same three exams —
 * Unit Test 1, Unit Test 2, Half Yearly — so the report-card templates
 * (see apply-fnic-halfyearly-report-cards.ts) have exams to link to.
 *
 * Classes I–V already share these three exams (copied here as the config
 * source). NUR, Prep and VI–XII get new exams cloned from them, with the
 * subject list built from each class's published report-card template.
 * Mont is moved off its two duplicate legacy "Unit Test 1" exams (which stay
 * for the legacy "Montessori" class) onto the new shared ones, otherwise the
 * duplicate would occupy Mont's Unit Test 2 slot.
 *
 * Dry run by default. Run: npx tsx src/scripts/create-fnic-halfyearly-exams.ts [--apply]
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Exam } from '../features/exams/exam.model';
import { ReportCardTemplate } from '../features/report-card-templates/report-card-template.model';
import { examSlotAutoLinkService } from '../features/report-card-templates/exam-slot-autolink.service';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const ACADEMIC_YEAR = '2026-27';
const APPLY = process.argv.includes('--apply');

const NEW_CLASSES = ['Mont', 'NUR', 'Prep', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const SPECS = [
  { name: 'UNIT TEST 1', examType: 'unit_test', order: 0 },
  { name: 'UNIT TEST 2', examType: 'unit_test', order: 1 },
  { name: 'Half Yearly', examType: 'half_yearly', order: 0 },
] as const;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log(APPLY ? 'APPLY MODE' : 'DRY RUN (pass --apply to write)');

  // Config source: the existing I–V exams, matched by name.
  const sources = await Promise.all(SPECS.map((s) => Exam.findOne({ schoolId: SCHOOL_ID, isDeleted: false, classesApplicable: 'I', name: s.name }).lean()));
  if (sources.some((s) => !s)) throw new Error('Class I UNIT TEST 1/2 or Half Yearly exam missing');

  // Subject list = every subject on the classes' templates.
  const templates = await ReportCardTemplate.find({ schoolId: SCHOOL_ID, academicYear: ACADEMIC_YEAR, class: { $in: NEW_CLASSES } }).lean();
  const subjects = [...new Set(templates.flatMap((t) => t.subjects.map((s) => s.name)))];
  console.log(`classes: ${NEW_CLASSES.join(', ')} | ${subjects.length} subjects`);

  // Mont off the legacy duplicate exams.
  const legacy = await Exam.find({ schoolId: SCHOOL_ID, isDeleted: false, classesApplicable: 'Mont', _id: { $nin: sources.map((s) => s!._id) }, createdBy: { $ne: 'FNIC half-yearly exam script' } }).lean();
  for (const e of legacy) {
    console.log(`remove Mont from legacy exam "${e.name}" (${e._id}), keeps ${e.classesApplicable.filter((c) => c !== 'Mont').join(', ')}`);
    if (APPLY) await Exam.updateOne({ _id: e._id }, { $pull: { classesApplicable: 'Mont' } });
  }

  for (let i = 0; i < SPECS.length; i++) {
    const src = sources[i]!;
    const already = await Exam.findOne({ schoolId: SCHOOL_ID, isDeleted: false, name: src.name, classesApplicable: { $all: NEW_CLASSES } });
    if (already) { console.log(`"${src.name}" already exists for all new classes`); continue; }
    console.log(`create "${src.name}" for ${NEW_CLASSES.join(', ')}`);
    if (!APPLY) continue;
    const { _id, createdAt, updatedAt, ...rest } = src as typeof src & { createdAt: Date; updatedAt: Date };
    // Sequential creates keep createdAt order = UT1 < UT2 < Half Yearly, which the auto-link relies on.
    await Exam.create({ ...rest, classesApplicable: NEW_CLASSES, subjects, subjectConfigs: [], createdBy: 'FNIC half-yearly exam script' });
  }

  if (APPLY) await examSlotAutoLinkService.syncForClasses(SCHOOL_ID, [...NEW_CLASSES, 'I', 'II', 'III', 'IV', 'V']);

  const check = await ReportCardTemplate.find({ schoolId: SCHOOL_ID, academicYear: ACADEMIC_YEAR }).select('class examSlots').lean();
  for (const t of check) {
    const f = t.examSlots.firstTerm;
    console.log(t.class.padEnd(10), f.unitTest1ExamId ? 'UT1' : '---', f.unitTest2ExamId ? 'UT2' : '---', f.mainExamId ? 'HY' : '--');
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
