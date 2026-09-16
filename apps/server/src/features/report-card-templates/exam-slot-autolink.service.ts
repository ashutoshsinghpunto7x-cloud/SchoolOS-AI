import { Exam } from '../exams/exam.model';
import { ReportCardTemplate } from './report-card-template.model';
import { AcademicYear } from '../academic-year/academic-year.model';
import { logger } from '../../lib/logger';

/**
 * Whenever an exam is saved, keeps the active academic year's report-card
 * template — for every class the exam applies to — pointed at the right
 * exams for Unit Test 1/2 and the main (Half Yearly/Annual) exam. This is
 * what report-card generation actually reads (term-report-card.service.ts's
 * buildTermBlock), so without this step a newly created exam is invisible
 * to report cards until someone remembers to also set it on the separate
 * Exam Slots screen — confirmed live as the reason Class I/III/IV/V's
 * report cards showed no marks for any subject despite marks being saved
 * and submitted correctly (2026-09-17).
 *
 * This is the single source of truth for these six fields once any exam
 * exists for a class — every sync recomputes and overwrites all of them
 * (clearing any that no longer have a matching exam, e.g. after a delete),
 * so a slot never silently keeps pointing at an exam that no longer
 * applies. `startDate`/`endDate` on each slot are untouched — those stay
 * whatever an admin set on the Exam Slots screen.
 *
 * Bucketing rule: for each class, unit_test-type exams — ordered by
 * creation time — fill Unit Test 1 then Unit Test 2 of firstTerm, and a
 * 3rd/4th (if any) fill finalTerm's Unit Test 1/2, matching the typical
 * CBSE-style two-term structure (2 unit tests + one bigger exam per term).
 * A half_yearly-type exam is firstTerm's main exam; an annual-type exam is
 * finalTerm's.
 */
export const examSlotAutoLinkService = {
  async syncForClasses(schoolId: string, classes: string[]): Promise<void> {
    if (classes.length === 0) return;
    const activeYear = await AcademicYear.findOne({ schoolId, status: 'active' }).select('label').lean<{ label: string } | null>();
    if (!activeYear) return; // nothing to sync against without a current academic year

    for (const cls of classes) {
      try {
        await syncOneClass(schoolId, cls, activeYear.label);
      } catch (err) {
        // Never let a slot-sync failure block the exam save itself.
        logger.error('[ExamSlotAutoLink] Failed to sync report-card exam slots', { schoolId, class: cls, err });
      }
    }
  },
};

async function syncOneClass(schoolId: string, cls: string, academicYear: string): Promise<void> {
  const exams = await Exam.find({ schoolId, classesApplicable: cls, isDeleted: false })
    .select('_id examType createdAt')
    .sort({ createdAt: 1 })
    .lean<{ _id: unknown; examType: string; createdAt: Date }[]>();

  const unitTests = exams.filter((e) => e.examType === 'unit_test');
  const halfYearly = exams.filter((e) => e.examType === 'half_yearly');
  const annual = exams.filter((e) => e.examType === 'annual');

  const slots: Record<string, unknown> = {
    'examSlots.firstTerm.unitTest1ExamId': unitTests[0] ? String(unitTests[0]._id) : undefined,
    'examSlots.firstTerm.unitTest2ExamId': unitTests[1] ? String(unitTests[1]._id) : undefined,
    'examSlots.firstTerm.mainExamId': halfYearly[0] ? String(halfYearly[0]._id) : undefined,
    'examSlots.finalTerm.unitTest1ExamId': unitTests[2] ? String(unitTests[2]._id) : undefined,
    'examSlots.finalTerm.unitTest2ExamId': unitTests[3] ? String(unitTests[3]._id) : undefined,
    'examSlots.finalTerm.mainExamId': annual[0] ? String(annual[0]._id) : undefined,
  };
  const setFields = Object.fromEntries(Object.entries(slots).filter(([, v]) => v !== undefined));
  const unsetFields = Object.fromEntries(Object.entries(slots).filter(([, v]) => v === undefined).map(([k]) => [k, '']));

  const update: Record<string, unknown> = {};
  if (Object.keys(setFields).length > 0) update.$set = setFields;
  if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields;
  if (Object.keys(update).length === 0) return;

  await ReportCardTemplate.updateMany({ schoolId, class: cls, academicYear }, update);
}
