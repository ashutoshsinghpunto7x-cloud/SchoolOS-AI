import crypto from 'crypto';
import QRCode from 'qrcode';
import { termReportCardRepository } from './term-report-card.repository';
import { reportCardTemplateRepository } from '../report-card-templates/report-card-template.repository';
import { env } from '../../config/env';
import {
  ITermReportCard, ITermBlock, ITermSubjectRow, ITermReportCardSkillEntry, SkillGrade,
} from './term-report-card.model';
import { IReportCardTemplate, ITemplateExamSlot } from '../report-card-templates/report-card-template.model';
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

async function findMark(schoolId: string, examId: string | undefined, studentId: string, subjectName: string): Promise<IMarks | undefined> {
  if (!examId) return undefined;
  const records = await marksRepository.findByStudentExam(schoolId, examId, studentId);
  return records.find((r) => r.subjectName === subjectName);
}

/** Best-of-two-unit-tests merge for one term. Never fabricates a total when
 *  the main exam score is still missing — surfaces a warning instead, so a
 *  teacher can generate the card after only Unit Test 1 exists and regenerate
 *  once more marks land without losing anything. */
async function buildTermBlock(
  schoolId: string, studentId: string, template: IReportCardTemplate, slot: ITemplateExamSlot, termLabel: string,
): Promise<{ block: Omit<ITermBlock, 'attendance'>; warnings: string[] }> {
  const warnings: string[] = [];
  const subjectRows: ITermSubjectRow[] = [];
  let termTotalObtained = 0;
  let termTotalMax = 0;

  for (const subject of template.subjects) {
    const [ut1, ut2, main] = await Promise.all([
      findMark(schoolId, slot.unitTest1ExamId, studentId, subject.name),
      findMark(schoolId, slot.unitTest2ExamId, studentId, subject.name),
      findMark(schoolId, slot.mainExamId, studentId, subject.name),
    ]);

    const unitTest1Score = scoreFromMarks(ut1);
    const unitTest2Score = scoreFromMarks(ut2);
    const bestUnitTestScore =
      unitTest1Score != null && unitTest2Score != null
        ? Math.max(unitTest1Score, unitTest2Score)
        : unitTest1Score ?? unitTest2Score ?? undefined;
    const mainExamScore = scoreFromMarks(main);

    const termMaxMarks = subject.unitTestMaxMarks + subject.mainExamMaxMarks;
    const termTotal = bestUnitTestScore != null && mainExamScore != null ? bestUnitTestScore + mainExamScore : undefined;

    if (bestUnitTestScore == null) warnings.push(`${subject.name}: no Unit Test score yet for ${termLabel}`);
    if (mainExamScore == null) warnings.push(`${subject.name}: main exam score not yet entered for ${termLabel}`);

    subjectRows.push({
      subjectId: subject._id.toString(),
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

async function buildTermAttendance(schoolId: string, studentId: string, slot: ITemplateExamSlot, warnings: string[], termLabel: string) {
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

  const averages: number[] = [];
  const firstTermPercents: number[] = [];
  const finalTermPercents: number[] = [];
  for (const s of students) {
    const studentId = String(s._id);
    const [firstTerm, finalTerm] = await Promise.all([
      buildTermBlock(schoolId, studentId, template, template.examSlots.firstTerm, 'First Term'),
      buildTermBlock(schoolId, studentId, template, template.examSlots.finalTerm, 'Final Term'),
    ]);
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

function reconcileSkills(template: IReportCardTemplate, existing: ITermReportCardSkillEntry[]): ITermReportCardSkillEntry[] {
  const existingByRowId = new Map(existing.map((e) => [e.rowId, e]));
  const result: ITermReportCardSkillEntry[] = [];

  for (const section of template.skillSections) {
    for (const row of section.rows) {
      const rowId = row._id.toString();
      const prev = existingByRowId.get(rowId);
      result.push({
        sectionId: section._id.toString(),
        sectionName: section.name,
        rowId,
        rowLabel: row.label,
        firstTermGrade: prev?.firstTermGrade,
        finalTermGrade: prev?.finalTermGrade,
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

    const [firstTermResult, finalTermResult] = await Promise.all([
      buildTermBlock(ctx.schoolId, studentId, template, template.examSlots.firstTerm, 'First Term'),
      buildTermBlock(ctx.schoolId, studentId, template, template.examSlots.finalTerm, 'Final Term'),
    ]);

    const warnings = [...firstTermResult.warnings, ...finalTermResult.warnings];

    const firstTermAttendance = await buildTermAttendance(ctx.schoolId, studentId, template.examSlots.firstTerm, warnings, 'First Term');
    const finalTermAttendance = await buildTermAttendance(ctx.schoolId, studentId, template.examSlots.finalTerm, warnings, 'Final Term');

    const firstTerm: ITermBlock = { ...firstTermResult.block, attendance: firstTermAttendance };
    const finalTerm: ITermBlock = { ...finalTermResult.block, attendance: finalTermAttendance };

    const grandTotalObtained = firstTerm.termTotalObtained + finalTerm.termTotalObtained;
    const grandTotalMax = firstTerm.termTotalMax + finalTerm.termTotalMax;
    const grandAveragePercent = grandTotalMax > 0 ? Math.round((grandTotalObtained / grandTotalMax) * 10000) / 100 : 0;
    // Grading key entries are label+description only (no numeric bands), so
    // there's no automatic percentage→letter mapping — overallGrade stays
    // unset unless a principal enters one via remarks/UI in a later iteration.
    const overallGrade: string | undefined = undefined;

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

    const existing = await termReportCardRepository.findByStudentYear(ctx.schoolId, studentId, academicYear);
    const skills = reconcileSkills(template, existing?.skills ?? []);

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
      }
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
