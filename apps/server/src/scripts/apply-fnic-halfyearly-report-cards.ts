/**
 * One-off: builds and publishes the 2026-27 report-card template for every FNIC
 * (school_001) class, with subjects taken from the Half Yearly date sheets
 * signed 13.08.26. Teachers then only enter marks; cards generate from them.
 *
 * - Existing templates keep their skill sections, grading key and exam slots;
 *   only `subjects` is replaced. A row whose name matches an old row (ignoring
 *   spaces/punctuation) keeps its _id so already-generated cards stay attached.
 * - Missing templates are created with the grading key and "Personal, Social
 *   and Work Habits" section copied from Class I's template.
 * - Subjects marks have historically been entered under a different name get a
 *   `marksSubjectName` alias (Mathematics<-Maths, etc.), so existing marks still count.
 * - Any new subject name is appended to the subject list of exams that already
 *   apply to the class, so teachers can pick it in marks entry.
 *
 * Dry run by default. Run: npx tsx src/scripts/apply-fnic-halfyearly-report-cards.ts [--apply]
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { ReportCardTemplate } from '../features/report-card-templates/report-card-template.model';
import { Exam } from '../features/exams/exam.model';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHOOL_ID = 'school_001';
const ACADEMIC_YEAR = '2026-27';
const APPLY = process.argv.includes('--apply');

/** Subject marks have been entered under, where it differs from the date-sheet name. */
const ALIAS: Record<string, string> = {
  'Mathematics': 'Maths',
  'E.V.S.': 'EVS',
  'Social Studies': 'S.S.T',
};

/** Graded (no marks) — matches how the existing templates treat Art/Moral Science/etc. */
const GRADE_ONLY = new Set(['Art', 'Moral Science', 'M.T.', 'Drawing', 'P.T./Music']);

const PRE_PRIMARY = ['English Written', 'English Oral/Rhymes', 'Maths Written', 'Maths Oral', 'Hindi Written', 'Hindi Oral',
  'Art', 'Hindi/English Conversation', 'Story (Hindi/English)', 'P.T./Music'];

const SCIENCES_8 = ['Physics', 'Chemistry', 'Biology'];
const LANGS_PRIMARY = ['English Literature', 'English Language', 'Hindi Literature', 'Hindi Language'];
const SENIOR_ARTS = ['Book Keeping and Accountancy', 'Business Organization', 'Economics', 'Sociology', 'Political Science', 'Drawing'];

const SUBJECTS: Record<string, string[]> = {
  Mont: PRE_PRIMARY,
  NUR: PRE_PRIMARY,
  Prep: ['English Written', 'English Spelling/Pattern Writing', 'E.V.S.', 'Maths Written', 'Art', 'Hindi/English Rhymes',
    'Hindi Spelling/Pattern Writing', 'Hindi Written', 'Hindi/English Conversation & Reading', 'Hindi/English Story', 'P.T./Music'],
  I:   [...LANGS_PRIMARY, 'Mathematics', 'E.V.S.', 'General Knowledge', 'Abacus', 'Moral Science', 'Art', 'Computer'],
  II:  [...LANGS_PRIMARY, 'Mathematics', 'E.V.S.', 'General Knowledge', 'Abacus', 'Moral Science', 'Art', 'Computer'],
  III: [...LANGS_PRIMARY, 'Mathematics', 'E.V.S.', 'Social Studies', 'General Knowledge', 'Abacus', 'Art', 'Computer', 'M.T.'],
  IV:  [...LANGS_PRIMARY, 'Mathematics', 'Science', 'Social Studies', 'General Knowledge', 'Abacus', 'Art', 'Computer', 'M.T.'],
  V:   [...LANGS_PRIMARY, 'Mathematics', 'Science', 'Social Studies', 'General Knowledge', 'Abacus', 'Art', 'Computer', 'M.T.'],
  VI:  [...LANGS_PRIMARY, 'Mathematics', ...SCIENCES_8, 'History and Civics', 'Geography', 'Computer', 'Abacus', 'Sanskrit', 'Art', 'General Knowledge', 'M.T.'],
  VII: [...LANGS_PRIMARY, 'Mathematics', ...SCIENCES_8, 'History and Civics', 'Geography', 'Computer', 'Sanskrit', 'Art', 'General Knowledge', 'M.T.'],
  VIII: [...LANGS_PRIMARY, 'Mathematics', ...SCIENCES_8, 'History and Civics', 'Geography', 'Computer', 'Sanskrit', 'Art', 'General Knowledge', 'M.T.'],
  IX:  ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Home Science', 'Computer Science', 'Art', 'Commerce'],
  X:   ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Home Science', 'Computer Science', 'Art', 'Commerce'],
  XI:  ['English', 'Hindi', 'Mathematics', ...SCIENCES_8, ...SENIOR_ARTS],
  XII: ['English', 'Hindi', 'Mathematics', ...SCIENCES_8, ...SENIOR_ARTS],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log(APPLY ? 'APPLY MODE' : 'DRY RUN (pass --apply to write)');

  const source = await ReportCardTemplate.findOne({ schoolId: SCHOOL_ID, class: 'I', academicYear: ACADEMIC_YEAR }).lean();
  if (!source) throw new Error('Class I template missing — cannot clone grading key');
  const habits = source.skillSections.find((s) => /habits/i.test(s.name));

  for (const [cls, names] of Object.entries(SUBJECTS)) {
    const existing = await ReportCardTemplate.findOne({ schoolId: SCHOOL_ID, class: cls, academicYear: ACADEMIC_YEAR });
    const oldByName = new Map((existing?.subjects ?? []).map((s) => [norm(s.name), s]));

    const subjects = names.map((name, order) => {
      const old = oldByName.get(norm(name));
      const grade = GRADE_ONLY.has(name);
      return {
        ...(old ? { _id: old._id } : {}),
        name,
        ...(ALIAS[name] ? { marksSubjectName: ALIAS[name] } : {}),
        evaluationType: grade ? 'grade' : 'marks',
        order,
        unitTestMaxMarks: grade ? 0 : 20,
        mainExamMaxMarks: grade ? 0 : 80,
      };
    });
    const dropped = (existing?.subjects ?? []).filter((s) => !names.some((n) => norm(n) === norm(s.name))).length;
    console.log(`${cls.padEnd(5)} ${existing ? `update (was ${existing.status}, ${existing.subjects.length} rows, ${dropped} dropped)` : 'create'} -> ${names.length} subjects, published`);

    if (APPLY) {
      if (existing) {
        existing.set('subjects', subjects);
        existing.status = 'published';
        existing.updatedBy = 'FNIC half-yearly date-sheet script';
        await existing.save();
      } else {
        await ReportCardTemplate.create({
          schoolId: SCHOOL_ID, class: cls, academicYear: ACADEMIC_YEAR, status: 'published',
          subjects,
          skillSections: habits ? [{ name: habits.name, order: 0, rows: habits.rows.map((r, i) => ({ label: r.label, order: i })) }] : [],
          gradingKey: source.gradingKey.map((g) => ({ label: g.label, description: g.description, order: g.order, minPercent: g.minPercent, maxPercent: g.maxPercent })),
          examSlots: { firstTerm: {}, finalTerm: {} },
          createdBy: 'FNIC half-yearly date-sheet script',
        });
      }
    }

    // Let teachers pick the new subject names in marks entry on exams already set up for this class.
    const exams = await Exam.find({ schoolId: SCHOOL_ID, classesApplicable: cls, isDeleted: false });
    for (const exam of exams) {
      const have = new Set(exam.subjects.map(norm));
      const toAdd = names.filter((n) => !have.has(norm(n)) && !(ALIAS[n] && have.has(norm(ALIAS[n]))));
      if (toAdd.length === 0) continue;
      console.log(`      exam "${exam.name}": +${toAdd.join(', ')}`);
      if (APPLY) await Exam.updateOne({ _id: exam._id }, { $push: { subjects: { $each: toAdd } } });
    }
  }
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
