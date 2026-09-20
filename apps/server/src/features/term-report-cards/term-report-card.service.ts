import crypto from 'crypto';
import QRCode from 'qrcode';
import { termReportCardRepository } from './term-report-card.repository';
import { reportCardTemplateRepository } from '../report-card-templates/report-card-template.repository';
import { env } from '../../config/env';
import {
  ITermReportCard, ITermBlock, ITermSubjectRow, ITermAttendance, ITermReportCardSkillEntry, SkillGrade,
} from './term-report-card.model';
import { IReportCardTemplate, ITemplateExamSlot, ITemplateSubjectRow } from '../report-card-templates/report-card-template.model';
import {
  generateTermReportCardSchema, updateTermReportCardSchema, updateTermReportCardSkillsSchema, rosterQuerySchema,
} from './term-report-card.validation';
import { studentRepository } from '../students/student.repository';
import { Student } from '../students/student.model';
import { marksRepository } from '../marks/marks.repository';
import { IMarks } from '../marks/marks.model';
import { attendanceRepository } from '../attendance/attendance.repository';
import { NotFoundError, ValidationError, ForbiddenError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { PromotionStatus } from '../report-cards/report-card.model';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreFromMarks(m: IMarks | undefined): number | undefined {
  return m && m.result !== 'na' && typeof m.total === 'number' ? m.total : undefined;
}

/** Fetches every subject's Marks for one student+exam in a single query — callers
 *  (buildTermBlock) look subjects up from this in memory instead of re-querying per
 *  subject. Was previously a per-(exam, subject) query inside buildTermBlock's subject
 *  loop: since unitTest1ExamId/unitTest2ExamId/mainExamId are the same for every subject
 *  in a term, that redundantly re-ran the identical query once per subject (21 times for
 *  a 21-subject template) — ~63 DB round trips per student per term, times every student
 *  in computeClassStats, made class-wide report-card generation take minutes. */
async function findMarksForExam(schoolId: string, examId: string | undefined, studentId: string): Promise<IMarks[]> {
  if (!examId) return [];
  return marksRepository.findByStudentExam(schoolId, examId, studentId);
}

/** Best-of-two-unit-tests merge for one term. Never fabricates a total when
 *  the main exam score is still missing — surfaces a warning instead, so a
 *  teacher can generate the card after only Unit Test 1 exists and regenerate
 *  once more marks land without losing anything.
 *
 *  `existingRows` are this term's subject rows from the card as it stood before
 *  this (re)generate — any row already flagged `manuallyCorrected` (via "Fix a
 *  mark") is carried over untouched instead of being overwritten from Marks, so
 *  regenerating to pick up newly-entered marks elsewhere never wipes a correction. */
async function buildTermBlock(
  schoolId: string, studentId: string, template: IReportCardTemplate, slot: ITemplateExamSlot, termLabel: string,
  existingRows: ITermSubjectRow[],
): Promise<{ block: Omit<ITermBlock, 'attendance'>; warnings: string[] }> {
  const warnings: string[] = [];
  const subjectRows: ITermSubjectRow[] = [];
  let termTotalObtained = 0;
  let termTotalMax = 0;
  const existingBySubjectId = new Map(existingRows.map((r) => [r.subjectId, r]));

  // One query per exam slot (not per subject) — see findMarksForExam.
  const [ut1Marks, ut2Marks, mainMarks] = await Promise.all([
    findMarksForExam(schoolId, slot.unitTest1ExamId, studentId),
    findMarksForExam(schoolId, slot.unitTest2ExamId, studentId),
    findMarksForExam(schoolId, slot.mainExamId, studentId),
  ]);
  // Falls back to the row's `marksSubjectName` alias when a lookup by the
  // report card's own display name comes up empty — the exam/timetable
  // this class's marks are entered against doesn't always call a subject
  // the same thing the report card displays it as (e.g. row "Science/EVS"
  // but marks entered under "Science").
  const findFor = (records: IMarks[], subject: ITemplateSubjectRow) =>
    records.find((r) => r.subjectName === subject.name)
    ?? (subject.marksSubjectName ? records.find((r) => r.subjectName === subject.marksSubjectName) : undefined);

  for (const subject of template.subjects) {
    const subjectId = subject._id.toString();
    const existingRow = existingBySubjectId.get(subjectId);
    const termMaxMarks = subject.unitTestMaxMarks + subject.mainExamMaxMarks;

    if (existingRow?.manuallyCorrected) {
      subjectRows.push({ ...existingRow, subjectName: subject.name, unitTestMaxMarks: subject.unitTestMaxMarks, mainExamMaxMarks: subject.mainExamMaxMarks, termMaxMarks });
      if (existingRow.termTotal != null && (existingRow.evaluationType === 'marks' || existingRow.evaluationType === 'both')) {
        termTotalObtained += existingRow.termTotal;
        termTotalMax += termMaxMarks;
      }
      continue;
    }

    const ut1 = findFor(ut1Marks, subject);
    const ut2 = findFor(ut2Marks, subject);
    const main = findFor(mainMarks, subject);

    const unitTest1Score = scoreFromMarks(ut1);
    const unitTest2Score = scoreFromMarks(ut2);
    const bestUnitTestScore =
      unitTest1Score != null && unitTest2Score != null
        ? Math.max(unitTest1Score, unitTest2Score)
        : unitTest1Score ?? unitTest2Score ?? undefined;
    const mainExamScore = scoreFromMarks(main);

    const termTotal = bestUnitTestScore != null && mainExamScore != null ? bestUnitTestScore + mainExamScore : undefined;

    if (bestUnitTestScore == null) warnings.push(`${subject.name}: no Unit Test score yet for ${termLabel}`);
    if (mainExamScore == null) warnings.push(`${subject.name}: main exam score not yet entered for ${termLabel}`);

    subjectRows.push({
      subjectId,
      subjectName: subject.name,
      evaluationType: subject.evaluationType,
      unitTestMaxMarks: subject.unitTestMaxMarks,
      mainExamMaxMarks: subject.mainExamMaxMarks,
      unitTest1Score,
      unitTest2Score,
      bestUnitTestScore,
      mainExamScore,
      termTotal,
      termMaxMarks,
      grade: main?.grade,
      result: main?.result ?? 'na',
    });

    if (termTotal != null && (subject.evaluationType === 'marks' || subject.evaluationType === 'both')) {
      termTotalObtained += termTotal;
      termTotalMax += termMaxMarks;
    }
  }

  const termPercentage = termTotalMax > 0 ? Math.round((termTotalObtained / termTotalMax) * 10000) / 100 : 0;

  return {
    block: {
      unitTest1ExamId: slot.unitTest1ExamId,
      unitTest2ExamId: slot.unitTest2ExamId,
      mainExamId: slot.mainExamId,
      subjectRows,
      termTotalObtained,
      termTotalMax,
      termPercentage,
    },
    warnings,
  };
}

/** `existingAttendance` is this term's attendance from the card as it stood before this
 *  (re)generate — if it was flagged `manuallyCorrected` (via "Fix attendance"), it's carried
 *  over untouched instead of being recomputed from the Attendance module. */
async function buildTermAttendance(
  schoolId: string, studentId: string, slot: ITemplateExamSlot, warnings: string[], termLabel: string,
  existingAttendance: ITermAttendance | undefined,
): Promise<ITermAttendance> {
  if (existingAttendance?.manuallyCorrected) return existingAttendance;

  if (!slot.startDate || !slot.endDate) {
    warnings.push(`${termLabel}: term date range not configured on the template — showing full-year attendance`);
  }
  const summary = await attendanceRepository.getSummary(schoolId, {
    studentId, dateFrom: slot.startDate, dateTo: slot.endDate,
  });
  return {
    workingDays: summary.total,
    present: summary.present,
    absent: summary.absent,
    late: summary.late,
    halfDay: summary.half_day,
    leaveApproved: summary.leave_approved,
    percent: summary.attendanceRate,
  };
}

function derivePromotionStatus(hasFinalTermData: boolean, passPercent: number, grandAveragePercent: number): PromotionStatus {
  if (!hasFinalTermData) return 'pending';
  return grandAveragePercent >= passPercent ? 'promoted' : 'not_promoted';
}

async function computeClassStats(
  schoolId: string, template: IReportCardTemplate, cls: string, section: string,
): Promise<{ averages: number[]; firstTermPercents: number[]; finalTermPercents: number[]; classSize: number }> {
  const students = await Student.find({ schoolId, class: cls, section, admissionStatus: 'active', isDeleted: false })
    .select('_id').lean<{ _id: unknown }[]>();

  // Per student this is already just 6 queries (3 exam slots x 2 terms, each one
  // query covering every subject — see findMarksForExam), so running the whole
  // class in parallel rather than one student at a time is safe and fast.
  const perStudent = await Promise.all(students.map(async (s) => {
    const studentId = String(s._id);
    // Classmate averages/ranks are a fresh read of the underlying Marks — not the
    // one card being viewed — so there's no "existing corrected rows" to carry over here.
    const [firstTerm, finalTerm] = await Promise.all([
      buildTermBlock(schoolId, studentId, template, template.examSlots.firstTerm, 'First Term', []),
      buildTermBlock(schoolId, studentId, template, template.examSlots.finalTerm, 'Final Term', []),
    ]);
    return { firstTerm, finalTerm };
  }));

  const averages: number[] = [];
  const firstTermPercents: number[] = [];
  const finalTermPercents: number[] = [];
  for (const { firstTerm, finalTerm } of perStudent) {
    const grandTotalMax = firstTerm.block.termTotalMax + finalTerm.block.termTotalMax;
    const grandTotalObtained = firstTerm.block.termTotalObtained + finalTerm.block.termTotalObtained;
    if (grandTotalMax > 0) {
      averages.push(Math.round((grandTotalObtained / grandTotalMax) * 10000) / 100);
    }
    if (firstTerm.block.termTotalMax > 0) firstTermPercents.push(firstTerm.block.termPercentage);
    if (finalTerm.block.termTotalMax > 0) finalTermPercents.push(finalTerm.block.termPercentage);
  }

  return { averages, firstTermPercents, finalTermPercents, classSize: students.length };
}

/** 1-based rank of `value` within `pool` (highest percentage = rank 1), or undefined if
 *  `value` didn't clear the max-marks bar that would have put it in the pool at all. */
function rankWithin(pool: number[], value: number, hasData: boolean): number | undefined {
  if (!hasData) return undefined;
  return [...pool].sort((a, b) => b - a).indexOf(value) + 1;
}

/** Re-derives a term block's totals from its (possibly just-corrected) subject rows — same
 *  best-of-two-unit-tests + evaluationType rules as buildTermBlock, but operating on rows already
 *  stored on the document instead of pulling fresh Marks records. */
function recomputeTermBlockTotals(block: ITermBlock): void {
  let termTotalObtained = 0;
  let termTotalMax = 0;
  for (const row of block.subjectRows) {
    row.bestUnitTestScore = row.unitTest1Score != null && row.unitTest2Score != null
      ? Math.max(row.unitTest1Score, row.unitTest2Score)
      : row.unitTest1Score ?? row.unitTest2Score ?? undefined;
    row.termTotal = row.bestUnitTestScore != null && row.mainExamScore != null ? row.bestUnitTestScore + row.mainExamScore : undefined;
    if (row.termTotal != null && (row.evaluationType === 'marks' || row.evaluationType === 'both')) {
      termTotalObtained += row.termTotal;
      termTotalMax += row.termMaxMarks;
    }
  }
  block.termTotalObtained = termTotalObtained;
  block.termTotalMax = termTotalMax;
  block.termPercentage = termTotalMax > 0 ? Math.round((termTotalObtained / termTotalMax) * 10000) / 100 : 0;
}

/** Re-derives just the "no Unit Test score yet" / "main exam score not yet entered" warnings
 *  for one term block, off its current (possibly just-corrected) subject rows — same rule
 *  buildTermBlock uses when generating from scratch. Used after a "Fix a mark" correction so
 *  the Review-before-publishing list shrinks to match what's actually still missing, instead
 *  of staying frozen at whatever it was when the card was first generated. */
function deriveSubjectRowWarnings(block: ITermBlock, termLabel: string): string[] {
  const warnings: string[] = [];
  for (const row of block.subjectRows) {
    if (row.bestUnitTestScore == null) warnings.push(`${row.subjectName}: no Unit Test score yet for ${termLabel}`);
    if (row.mainExamScore == null) warnings.push(`${row.subjectName}: main exam score not yet entered for ${termLabel}`);
  }
  return warnings;
}

const SUBJECT_WARNING_PATTERN = /: no Unit Test score yet for |: main exam score not yet entered for /;

/** Picks the grading-key label whose percentage band covers `percent`, or undefined if the
 *  key has no percentage-banded entries (or none of them cover it). Used to derive both the
 *  overall/subject grade and the SS1/SS2 skill grades from actual marks, rather than leaving
 *  them for someone to type in by hand. */
function gradeForPercent(gradingKey: IReportCardTemplate['gradingKey'], percent: number): string | undefined {
  return gradingKey.find((g) => g.minPercent != null && g.maxPercent != null && percent >= g.minPercent && percent <= g.maxPercent)?.label;
}

/** SS1/SS2 skill grades reflect the student's overall performance for that term — they're
 *  always (re)derived from the term's percentage against the template's grading key, never
 *  left as whatever was typed in previously, so they can't drift out of sync with the marks
 *  a mark correction just changed. `updateSkills` can still set a one-off override, but the
 *  next mark correction or regenerate recomputes over it. */
function reconcileSkills(
  template: IReportCardTemplate, firstTermPercent: number, finalTermPercent: number,
): ITermReportCardSkillEntry[] {
  const autoFirstTermGrade = gradeForPercent(template.gradingKey, firstTermPercent) as SkillGrade | undefined;
  const autoFinalTermGrade = gradeForPercent(template.gradingKey, finalTermPercent) as SkillGrade | undefined;
  const result: ITermReportCardSkillEntry[] = [];

  for (const section of template.skillSections) {
    for (const row of section.rows) {
      result.push({
        sectionId: section._id.toString(),
        sectionName: section.name,
        rowId: row._id.toString(),
        rowLabel: row.label,
        firstTermGrade: autoFirstTermGrade,
        finalTermGrade: autoFinalTermGrade,
      });
    }
  }

  return result;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const termReportCardService = {
  async generate(rawInput: unknown, ctx: AuthContext): Promise<ITermReportCard> {
    const { studentId, academicYear } = generateTermReportCardSchema.parse(rawInput);

    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');

    const template = await reportCardTemplateRepository.findByClassYear(ctx.schoolId, student.class, academicYear);
    if (!template) throw new NotFoundError('Report card template');
    if (template.status !== 'published') {
      throw new ValidationError(`The report card template for class "${student.class}" (${academicYear}) is still a draft — publish it before generating cards`);
    }

    // Fetched up front (not just for verificationToken, below) so a regenerate can carry
    // forward any row/attendance a teacher already corrected by hand instead of wiping it.
    const existing = await termReportCardRepository.findByStudentYear(ctx.schoolId, studentId, academicYear);

    const [firstTermResult, finalTermResult] = await Promise.all([
      buildTermBlock(ctx.schoolId, studentId, template, template.examSlots.firstTerm, 'First Term', existing?.firstTerm.subjectRows ?? []),
      buildTermBlock(ctx.schoolId, studentId, template, template.examSlots.finalTerm, 'Final Term', existing?.finalTerm.subjectRows ?? []),
    ]);

    const warnings = [...firstTermResult.warnings, ...finalTermResult.warnings];

    const firstTermAttendance = await buildTermAttendance(ctx.schoolId, studentId, template.examSlots.firstTerm, warnings, 'First Term', existing?.firstTerm.attendance);
    const finalTermAttendance = await buildTermAttendance(ctx.schoolId, studentId, template.examSlots.finalTerm, warnings, 'Final Term', existing?.finalTerm.attendance);

    const firstTerm: ITermBlock = { ...firstTermResult.block, attendance: firstTermAttendance };
    const finalTerm: ITermBlock = { ...finalTermResult.block, attendance: finalTermAttendance };

    const grandTotalObtained = firstTerm.termTotalObtained + finalTerm.termTotalObtained;
    const grandTotalMax = firstTerm.termTotalMax + finalTerm.termTotalMax;
    const grandAveragePercent = grandTotalMax > 0 ? Math.round((grandTotalObtained / grandTotalMax) * 10000) / 100 : 0;
    // Only derived once there's a grand total to derive it from — a grading key
    // with no percentage bands configured also leaves this unset (gradeForPercent
    // returns undefined), same as before percentage bands existed.
    const overallGrade = grandTotalMax > 0 ? gradeForPercent(template.gradingKey, grandAveragePercent) : undefined;

    const { averages, firstTermPercents, finalTermPercents, classSize } =
      await computeClassStats(ctx.schoolId, template, student.class, student.section);
    const sorted = [...averages].sort((a, b) => b - a);
    const rank = grandTotalMax > 0 ? sorted.indexOf(grandAveragePercent) + 1 : undefined;

    firstTerm.rank = rankWithin(firstTermPercents, firstTerm.termPercentage, firstTerm.termTotalMax > 0);
    firstTerm.classSize = firstTerm.termTotalMax > 0 ? firstTermPercents.length : undefined;
    finalTerm.rank = rankWithin(finalTermPercents, finalTerm.termPercentage, finalTerm.termTotalMax > 0);
    finalTerm.classSize = finalTerm.termTotalMax > 0 ? finalTermPercents.length : undefined;

    const hasFinalTermData = finalTerm.termTotalMax > 0;
    const promotionStatus = derivePromotionStatus(hasFinalTermData, 33, grandAveragePercent);

    const skills = reconcileSkills(
      template,
      firstTerm.termTotalMax > 0 ? firstTerm.termPercentage : NaN,
      finalTerm.termTotalMax > 0 ? finalTerm.termPercentage : NaN,
    );

    const saved = await termReportCardRepository.upsert({
      schoolId: ctx.schoolId,
      studentId,
      class: student.class,
      section: student.section,
      academicYear,
      templateId: template._id.toString(),
      firstTerm,
      finalTerm,
      grandTotalObtained,
      grandTotalMax,
      grandAveragePercent,
      overallGrade,
      skills,
      summary: { rank, classSize, promotionStatus },
      warnings,
      verificationToken: existing?.verificationToken ?? crypto.randomUUID(),
      generatedById: ctx.userId,
      generatedByName: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'term_report_card.generated', resource: 'term_report_card',
      resourceId: saved._id.toString(), details: { studentId, academicYear, grandAveragePercent }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return saved;
  },

  async getById(id: string, ctx: AuthContext): Promise<ITermReportCard> {
    const card = await termReportCardRepository.findById(id, ctx.schoolId);
    if (!card) throw new NotFoundError('Term report card');
    return card;
  },

  async getQrImage(id: string, ctx: AuthContext): Promise<{ dataUri: string; verifyUrl: string }> {
    const card = await termReportCardRepository.findById(id, ctx.schoolId);
    if (!card) throw new NotFoundError('Term report card');

    const verifyUrl = `${env.FRONTEND_URL}/verify/term-report-card/${card.verificationToken}`;
    const dataUri = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });
    return { dataUri, verifyUrl };
  },

  async getByStudentYear(studentId: string, academicYear: string, ctx: AuthContext): Promise<ITermReportCard | null> {
    return termReportCardRepository.findByStudentYear(ctx.schoolId, studentId, academicYear);
  },

  /** Public, unauthenticated — used by the QR-code verification page. Only
   *  ever returns a small, non-sensitive subset (no marks breakdown). */
  async verifyByToken(token: string): Promise<{
    studentName: string; class: string; section: string; academicYear: string;
    overallGrade?: string; promotionStatus: PromotionStatus; issuedAt: Date; schoolId: string;
  }> {
    const card = await termReportCardRepository.findByToken(token);
    if (!card) throw new NotFoundError('Term report card');

    const student = await studentRepository.findById(card.studentId, card.schoolId);
    if (!student) throw new NotFoundError('Term report card');

    return {
      studentName: student.fullName,
      class: card.class,
      section: card.section,
      academicYear: card.academicYear,
      overallGrade: card.overallGrade,
      promotionStatus: card.summary.promotionStatus,
      issuedAt: card.generatedAt,
      schoolId: card.schoolId,
    };
  },

  async update(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITermReportCard> {
    const data = updateTermReportCardSchema.parse(rawInput);
    const card = await termReportCardRepository.findById(id, ctx.schoolId);
    if (!card) throw new NotFoundError('Term report card');

    // A teacher may correct subject marks and write their own class-teacher remark; the
    // principal's remark and parent feedback fields are leadership-only.
    const isLeadership = ctx.role === 'admin' || ctx.role === 'principal' || ctx.role === 'incharge';
    if (!isLeadership) {
      const leadershipOnlyFields = Object.keys(data).filter((k) => k === 'principalRemark' || k === 'parentFeedback');
      if (leadershipOnlyFields.length > 0) {
        throw new ForbiddenError('Only a principal can set the principal\'s remark or parent feedback.');
      }
    }

    if (data.subjectMarks !== undefined && data.subjectMarks.length > 0) {
      for (const correction of data.subjectMarks) {
        const block = correction.term === 'firstTerm' ? card.firstTerm : card.finalTerm;
        const row = block.subjectRows.find((r) => r.subjectName === correction.subjectName);
        if (!row) throw new ValidationError(`"${correction.subjectName}" is not a subject on this report card's ${correction.term === 'firstTerm' ? 'First' : 'Final'} Term`);

        if (correction.unitTest1Score !== undefined) {
          if (correction.unitTest1Score > row.unitTestMaxMarks) {
            throw new ValidationError(`${correction.subjectName}: Unit Test 1 score cannot exceed maximum (${row.unitTestMaxMarks})`);
          }
          row.unitTest1Score = correction.unitTest1Score;
        }
        if (correction.unitTest2Score !== undefined) {
          if (correction.unitTest2Score > row.unitTestMaxMarks) {
            throw new ValidationError(`${correction.subjectName}: Unit Test 2 score cannot exceed maximum (${row.unitTestMaxMarks})`);
          }
          row.unitTest2Score = correction.unitTest2Score;
        }
        if (correction.mainExamScore !== undefined) {
          if (correction.mainExamScore > row.mainExamMaxMarks) {
            throw new ValidationError(`${correction.subjectName}: main exam score cannot exceed maximum (${row.mainExamMaxMarks})`);
          }
          row.mainExamScore = correction.mainExamScore;
        }
        if (correction.grade !== undefined) row.grade = correction.grade;
        if (correction.evaluationType !== undefined) row.evaluationType = correction.evaluationType;
        // From here on, a regenerate leaves this row exactly as corrected instead of
        // overwriting it from Marks — that's the whole point of correcting it by hand.
        row.manuallyCorrected = true;
      }
      card.markModified('firstTerm');
      card.markModified('finalTerm');

      recomputeTermBlockTotals(card.firstTerm);
      recomputeTermBlockTotals(card.finalTerm);

      card.grandTotalObtained = card.firstTerm.termTotalObtained + card.finalTerm.termTotalObtained;
      card.grandTotalMax = card.firstTerm.termTotalMax + card.finalTerm.termTotalMax;
      card.grandAveragePercent = card.grandTotalMax > 0
        ? Math.round((card.grandTotalObtained / card.grandTotalMax) * 10000) / 100
        : 0;

      const template = await reportCardTemplateRepository.findById(card.templateId, ctx.schoolId);
      if (template) {
        const hasFinalTermData = card.finalTerm.termTotalMax > 0;
        card.summary.promotionStatus = derivePromotionStatus(hasFinalTermData, 33, card.grandAveragePercent);

        const { averages, classSize } = await computeClassStats(ctx.schoolId, template, card.class, card.section);
        card.summary.rank = card.grandTotalMax > 0
          ? averages.filter((a) => a > card.grandAveragePercent).length + 1
          : card.summary.rank;
        card.summary.classSize = classSize;

        // A mark correction changes the same percentages the skill/overall grades are
        // derived from — keep them in step rather than only refreshing on full regenerate.
        card.overallGrade = card.grandTotalMax > 0 ? gradeForPercent(template.gradingKey, card.grandAveragePercent) : undefined;
        card.skills = reconcileSkills(
          template,
          card.firstTerm.termTotalMax > 0 ? card.firstTerm.termPercentage : NaN,
          card.finalTerm.termTotalMax > 0 ? card.finalTerm.termPercentage : NaN,
        );
      }

      // Shrink the "Review before publishing" list to match what's actually still
      // missing after this correction — otherwise it stays frozen at whatever it
      // was when the card was first generated, even once every score is filled in.
      const nonSubjectWarnings = card.warnings.filter((w) => !SUBJECT_WARNING_PATTERN.test(w));
      card.warnings = [
        ...nonSubjectWarnings,
        ...deriveSubjectRowWarnings(card.firstTerm, 'First Term'),
        ...deriveSubjectRowWarnings(card.finalTerm, 'Final Term'),
      ];
      card.markModified('warnings');
    }

    if (data.attendance) {
      const block = data.attendance.term === 'firstTerm' ? card.firstTerm : card.finalTerm;
      const a = block.attendance;
      if (data.attendance.workingDays !== undefined) a.workingDays = data.attendance.workingDays;
      if (data.attendance.present !== undefined) a.present = data.attendance.present;
      if (data.attendance.absent !== undefined) a.absent = data.attendance.absent;
      if (data.attendance.late !== undefined) a.late = data.attendance.late;
      if (data.attendance.halfDay !== undefined) a.halfDay = data.attendance.halfDay;
      if (data.attendance.leaveApproved !== undefined) a.leaveApproved = data.attendance.leaveApproved;
      // Same formula and precision as attendance.repository.ts's getSummary
      // (which is what auto-fills this block originally), so a manually
      // corrected count still produces a consistent percentage.
      a.percent = a.workingDays > 0 ? Math.round(((a.present + a.late + a.halfDay) / a.workingDays) * 100) : 0;
      // From here on, a regenerate leaves this term's attendance exactly as corrected
      // instead of recomputing it from the Attendance module.
      a.manuallyCorrected = true;
      card.markModified(data.attendance.term);
    }

    if (data.teacherRemark !== undefined) card.teacherRemark = data.teacherRemark;
    if (data.principalRemark !== undefined) card.principalRemark = data.principalRemark;
    if (data.parentFeedback !== undefined) card.parentFeedback = data.parentFeedback;

    await card.save();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'term_report_card.updated', resource: 'term_report_card',
      resourceId: id, details: { changed: Object.keys(data) }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return card;
  },

  async updateSkills(id: string, rawInput: unknown, ctx: AuthContext): Promise<ITermReportCard> {
    const { skills } = updateTermReportCardSkillsSchema.parse(rawInput);
    const card = await termReportCardRepository.findById(id, ctx.schoolId);
    if (!card) throw new NotFoundError('Term report card');

    const template = await reportCardTemplateRepository.findById(card.templateId, ctx.schoolId);
    const validLabels = new Set((template?.gradingKey ?? []).map((g) => g.label));

    for (const update of skills) {
      const entry = card.skills.find((s) => s.rowId === update.rowId);
      if (!entry) continue;
      if (update.firstTermGrade !== undefined) {
        if (validLabels.size > 0 && !validLabels.has(update.firstTermGrade)) {
          throw new ValidationError(`"${update.firstTermGrade}" is not a valid grade for this template's grading key`);
        }
        entry.firstTermGrade = update.firstTermGrade as SkillGrade;
      }
      if (update.finalTermGrade !== undefined) {
        if (validLabels.size > 0 && !validLabels.has(update.finalTermGrade)) {
          throw new ValidationError(`"${update.finalTermGrade}" is not a valid grade for this template's grading key`);
        }
        entry.finalTermGrade = update.finalTermGrade as SkillGrade;
      }
    }

    await card.save();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'term_report_card.skills_updated', resource: 'term_report_card',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return card;
  },

  async publish(id: string, ctx: AuthContext): Promise<ITermReportCard> {
    const card = await termReportCardRepository.findById(id, ctx.schoolId);
    if (!card) throw new NotFoundError('Term report card');
    card.status = 'published';
    await card.save();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'term_report_card.published', resource: 'term_report_card',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return card;
  },

  /** Class roster for the "pick a student" screen — flags whether each
   *  student already has a card and how many source-data warnings it carries. */
  async getRoster(rawQuery: unknown, ctx: AuthContext): Promise<{
    template: IReportCardTemplate;
    rows: { studentId: string; fullName: string; rollNumber?: string; photoUrl?: string; hasReportCard: boolean; warningsCount: number }[];
  }> {
    const query = rosterQuerySchema.parse(rawQuery);

    const students = await Student.find({ schoolId: ctx.schoolId, class: query.class, section: query.section, admissionStatus: 'active', isDeleted: false })
      .select('_id fullName rollNumber photoUrl')
      .sort({ rollNumber: 1, fullName: 1 })
      .lean<{ _id: unknown; fullName: string; rollNumber?: string; photoUrl?: string }[]>();

    if (students.length === 0) {
      const template = await reportCardTemplateRepository.findByClassYear(ctx.schoolId, query.class, query.academicYear);
      if (!template) throw new NotFoundError('Report card template');
      return { template, rows: [] };
    }

    const template = await reportCardTemplateRepository.findByClassYear(ctx.schoolId, query.class, query.academicYear);
    if (!template) throw new NotFoundError('Report card template');

    const existingCards = await termReportCardRepository.findByClassYear(ctx.schoolId, query.class, query.section, query.academicYear);
    const cardByStudent = new Map(existingCards.map((c) => [c.studentId, c]));

    const rows = students.map((s) => {
      const studentId = String(s._id);
      const card = cardByStudent.get(studentId);
      return {
        studentId,
        fullName: s.fullName,
        rollNumber: s.rollNumber,
        photoUrl: s.photoUrl,
        hasReportCard: !!card,
        warningsCount: card?.warnings.length ?? 0,
      };
    });

    return { template, rows };
  },
};
