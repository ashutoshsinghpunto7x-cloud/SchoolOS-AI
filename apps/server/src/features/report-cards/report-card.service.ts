import crypto from 'crypto';
import QRCode from 'qrcode';
import { reportCardRepository } from './report-card.repository';
import { env } from '../../config/env';
import { IReportCard, ISubjectRow, ICoScholasticEntry, PromotionStatus } from './report-card.model';
import { generateReportCardSchema, updateReportCardSchema, rosterQuerySchema } from './report-card.validation';
import { examRepository } from '../exams/exam.repository';
import { IExam, SubjectEvaluationType } from '../exams/exam.model';
import { studentRepository } from '../students/student.repository';
import { Student } from '../students/student.model';
import { marksRepository } from '../marks/marks.repository';
import { IMarks } from '../marks/marks.model';
import { attendanceRepository } from '../attendance/attendance.repository';
import { openaiProvider } from '../ai/providers/llm/openai.provider';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { logger } from '../../lib/logger';

const DEFAULT_CO_SCHOLASTIC_ACTIVITIES = [
  'Art Education', 'Physical Education', 'Discipline', 'Music', 'Work Education', 'Life Skills',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveEvaluationType(exam: IExam, subjectName: string): SubjectEvaluationType {
  return exam.subjectConfigs?.find((c) => c.name === subjectName)?.evaluationType ?? 'marks';
}

function maxMarksForExam(exam: IExam): number {
  return exam.components.reduce((sum, c) => sum + c.maxMarks, 0);
}

function gradeForPercentage(exam: IExam, percentage: number): string | undefined {
  return exam.gradingBands.find((b) => percentage >= b.minPercent && percentage <= b.maxPercent)?.label;
}

/** Numeric-total subjects — grade-only subjects (e.g. Art, Music) are shown
 *  but never folded into the overall percentage/rank, matching how real
 *  scholastic-vs-co-scholastic report cards work. */
function countsTowardTotal(evaluationType: SubjectEvaluationType): boolean {
  return evaluationType === 'marks' || evaluationType === 'both';
}

interface StudentTotals {
  studentId: string;
  totalObtained: number;
  totalMaxMarks: number;
  percentage: number;
}

function computeStudentTotals(exam: IExam, marksRecords: IMarks[]): { rows: ISubjectRow[]; totals: StudentTotals; warnings: string[] } {
  const perSubjectMax = maxMarksForExam(exam);
  const marksBySubject = new Map(marksRecords.map((m) => [m.subjectName, m]));
  const rows: ISubjectRow[] = [];
  const warnings: string[] = [];

  let totalObtained = 0;
  let totalMaxMarks = 0;

  for (const subjectName of exam.subjects) {
    const evaluationType = resolveEvaluationType(exam, subjectName);
    const m = marksBySubject.get(subjectName);

    if (!m || m.result === 'na') {
      warnings.push(`Missing marks for ${subjectName}`);
      rows.push({ subjectName, evaluationType, maxMarks: perSubjectMax, result: 'na' });
      continue;
    }
    if ((evaluationType === 'grade' || evaluationType === 'both') && !m.grade) {
      warnings.push(`Grade missing for ${subjectName}`);
    }
    if (typeof m.total === 'number' && m.total > perSubjectMax) {
      warnings.push(`${subjectName}: marks obtained (${m.total}) exceed maximum (${perSubjectMax})`);
    }

    rows.push({
      subjectName,
      evaluationType,
      maxMarks: perSubjectMax,
      marksObtained: m.total,
      percentage: m.percentage,
      grade: m.grade,
      result: m.result,
      teacherRemark: m.remark,
    });

    if (countsTowardTotal(evaluationType) && typeof m.total === 'number') {
      totalObtained += m.total;
      totalMaxMarks += perSubjectMax;
    }
  }

  const percentage = totalMaxMarks > 0 ? Math.round((totalObtained / totalMaxMarks) * 10000) / 100 : 0;
  return { rows, totals: { studentId: '', totalObtained, totalMaxMarks, percentage }, warnings };
}

async function computeClassStats(
  schoolId: string, exam: IExam, cls: string, section: string,
): Promise<{ percentages: number[]; classSize: number }> {
  const [students, allMarks] = await Promise.all([
    Student.find({ schoolId, class: cls, section, admissionStatus: 'active', isDeleted: false })
      .select('_id').lean<{ _id: unknown }[]>(),
    marksRepository.findByClassExam(schoolId, exam._id.toString(), cls, section),
  ]);

  const marksByStudent = new Map<string, typeof allMarks>();
  for (const m of allMarks) {
    const list = marksByStudent.get(m.studentId) ?? [];
    list.push(m);
    marksByStudent.set(m.studentId, list);
  }

  const percentages: number[] = [];
  for (const s of students) {
    const studentId = String(s._id);
    const { totals } = computeStudentTotals(exam, marksByStudent.get(studentId) ?? []);
    if (totals.totalMaxMarks > 0) percentages.push(totals.percentage);
  }

  return { percentages, classSize: students.length };
}

function derivePromotionStatus(exam: IExam, percentage: number): PromotionStatus {
  if (exam.examType !== 'annual') return 'pending';
  return percentage >= exam.passPercent ? 'promoted' : 'not_promoted';
}

async function buildAiRemark(input: {
  studentName: string; class: string; section: string; examName: string;
  rows: ISubjectRow[]; percentage: number; overallGrade?: string;
  attendancePercent: number; promotionStatus: PromotionStatus; rank?: number; classSize?: number;
}): Promise<{ text: string; model?: string }> {
  const scoredSubjects = input.rows.filter((r) => typeof r.percentage === 'number');
  const best = scoredSubjects.length ? scoredSubjects.reduce((a, b) => (b.percentage! > a.percentage! ? b : a)) : undefined;
  const weakest = scoredSubjects.length ? scoredSubjects.reduce((a, b) => (b.percentage! < a.percentage! ? b : a)) : undefined;

  if (!openaiProvider.isAvailable()) {
    const parts = [`${input.studentName} scored ${input.percentage}% overall this term.`];
    if (best) parts.push(`Strongest performance in ${best.subjectName}.`);
    if (weakest && weakest.subjectName !== best?.subjectName) parts.push(`Additional focus recommended in ${weakest.subjectName}.`);
    parts.push(`Attendance stood at ${input.attendancePercent}%.`);
    return { text: parts.join(' ') };
  }

  const systemPrompt =
    'You are a thoughtful class teacher writing a report-card remark for a student. ' +
    'Write 2-3 short sentences, warm but professional, in the third person. ' +
    'Only reference facts present in the JSON data provided — never invent a number, subject, or achievement. ' +
    'Mention one strength and one area for growth if the data supports it. Avoid generic filler phrases.';

  const userPrompt = `Student data (JSON):\n${JSON.stringify({
    studentName: input.studentName,
    class: `${input.class}-${input.section}`,
    exam: input.examName,
    subjects: scoredSubjects.map((r) => ({ name: r.subjectName, percentage: r.percentage, grade: r.grade, result: r.result })),
    overallPercentage: input.percentage,
    overallGrade: input.overallGrade,
    attendancePercent: input.attendancePercent,
    rank: input.rank,
    classSize: input.classSize,
    promotionStatus: input.promotionStatus,
  }, null, 2)}`;

  try {
    const result = await openaiProvider.complete({ systemPrompt, userPrompt, temperature: 0.6, maxTokens: 220 });
    return { text: result.content.trim(), model: result.model };
  } catch (err) {
    logger.error('[ReportCard] AI remark generation failed, falling back to templated remark', { err });
    return { text: `${input.studentName} scored ${input.percentage}% overall this term. Attendance stood at ${input.attendancePercent}%.` };
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export const reportCardService = {
  async generate(rawInput: unknown, ctx: AuthContext): Promise<IReportCard> {
    const { examId, studentId } = generateReportCardSchema.parse(rawInput);

    const exam = await examRepository.findById(examId, ctx.schoolId);
    if (!exam) throw new NotFoundError('Exam');

    const student = await studentRepository.findById(studentId, ctx.schoolId);
    if (!student) throw new NotFoundError('Student');
    if (!exam.classesApplicable.includes(student.class)) {
      throw new ValidationError('This exam does not apply to this student\'s class');
    }

    const marksRecords = await marksRepository.findByStudentExam(ctx.schoolId, examId, studentId);
    const { rows, totals, warnings } = computeStudentTotals(exam, marksRecords);

    const { percentages, classSize } = await computeClassStats(ctx.schoolId, exam, student.class, student.section);
    const sorted = [...percentages].sort((a, b) => b - a);
    const rank = totals.totalMaxMarks > 0 ? sorted.indexOf(totals.percentage) + 1 : undefined;
    const highestMarksPercent = sorted.length ? sorted[0] : undefined;
    const classAveragePercent = percentages.length
      ? Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 100) / 100
      : undefined;

    const attendanceSummary = await attendanceRepository.getSummary(ctx.schoolId, { studentId });
    const overallGrade = gradeForPercentage(exam, totals.percentage);
    const promotionStatus = derivePromotionStatus(exam, totals.percentage);

    const existing = await reportCardRepository.findByExamStudent(ctx.schoolId, examId, studentId);

    let aiRemark = existing?.aiRemark;
    if (!aiRemark) {
      const generated = await buildAiRemark({
        studentName: student.fullName, class: student.class, section: student.section, examName: exam.name,
        rows, percentage: totals.percentage, overallGrade, attendancePercent: attendanceSummary.attendanceRate,
        promotionStatus, rank, classSize,
      });
      aiRemark = { text: generated.text, model: generated.model, generatedAt: new Date(), edited: false };
    }

    const saved = await reportCardRepository.upsert({
      schoolId: ctx.schoolId,
      examId,
      studentId,
      class: student.class,
      section: student.section,
      subjects: rows,
      summary: {
        totalMaxMarks: totals.totalMaxMarks,
        totalObtained: totals.totalObtained,
        percentage: totals.percentage,
        overallGrade,
        rank,
        classSize,
        promotionStatus,
        highestMarksPercent,
        classAveragePercent,
      },
      attendance: {
        workingDays: attendanceSummary.total,
        present: attendanceSummary.present,
        absent: attendanceSummary.absent,
        late: attendanceSummary.late,
        halfDay: attendanceSummary.half_day,
        leaveApproved: attendanceSummary.leave_approved,
        percent: attendanceSummary.attendanceRate,
      },
      warnings,
      verificationToken: existing?.verificationToken ?? crypto.randomUUID(),
      generatedById: ctx.userId,
      generatedByName: ctx.displayName,
      coScholasticIfNew: DEFAULT_CO_SCHOLASTIC_ACTIVITIES.map((activity) => ({ activity, grade: '' })),
    });

    // aiRemark isn't part of the upsert payload (it must never be blanked by a
    // routine regenerate) — set it separately, once, right after.
    if (!existing?.aiRemark) {
      saved.aiRemark = aiRemark;
      await saved.save();
    }

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'report_card.generated', resource: 'report_card',
      resourceId: saved._id.toString(), details: { examId, studentId, percentage: totals.percentage },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return saved;
  },

  async getById(id: string, ctx: AuthContext): Promise<IReportCard> {
    const card = await reportCardRepository.findById(id, ctx.schoolId);
    if (!card) throw new NotFoundError('Report card');
    return card;
  },

  /** Data-URI QR pointing at the public, unauthenticated verification page —
   *  same qrcode-package pattern as employee ID cards (employee.service.ts). */
  async getQrImage(id: string, ctx: AuthContext): Promise<{ dataUri: string; verifyUrl: string }> {
    const card = await reportCardRepository.findById(id, ctx.schoolId);
    if (!card) throw new NotFoundError('Report card');

    const verifyUrl = `${env.FRONTEND_URL}/verify/report-card/${card.verificationToken}`;
    const dataUri = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });
    return { dataUri, verifyUrl };
  },

  async getByExamStudent(examId: string, studentId: string, ctx: AuthContext): Promise<IReportCard | null> {
    return reportCardRepository.findByExamStudent(ctx.schoolId, examId, studentId);
  },

  /** Public, unauthenticated — used by the QR-code verification page. Only
   *  ever returns a small, non-sensitive subset (no marks breakdown). */
  async verifyByToken(token: string): Promise<{
    studentName: string; class: string; section: string; examName: string;
    overallGrade?: string; promotionStatus: PromotionStatus; issuedAt: Date; schoolId: string;
  }> {
    const card = await reportCardRepository.findByToken(token);
    if (!card) throw new NotFoundError('Report card');

    const [exam, student] = await Promise.all([
      examRepository.findById(card.examId, card.schoolId),
      studentRepository.findById(card.studentId, card.schoolId),
    ]);
    if (!exam || !student) throw new NotFoundError('Report card');

    return {
      studentName: student.fullName,
      class: card.class,
      section: card.section,
      examName: exam.name,
      overallGrade: card.summary.overallGrade,
      promotionStatus: card.summary.promotionStatus,
      issuedAt: card.generatedAt,
      schoolId: card.schoolId,
    };
  },

  async regenerateRemark(id: string, ctx: AuthContext): Promise<IReportCard> {
    const card = await reportCardRepository.findById(id, ctx.schoolId);
    if (!card) throw new NotFoundError('Report card');

    const [exam, student] = await Promise.all([
      examRepository.findById(card.examId, ctx.schoolId),
      studentRepository.findById(card.studentId, ctx.schoolId),
    ]);
    if (!exam || !student) throw new NotFoundError('Report card');

    const generated = await buildAiRemark({
      studentName: student.fullName, class: card.class, section: card.section, examName: exam.name,
      rows: card.subjects, percentage: card.summary.percentage, overallGrade: card.summary.overallGrade,
      attendancePercent: card.attendance.percent, promotionStatus: card.summary.promotionStatus,
      rank: card.summary.rank, classSize: card.summary.classSize,
    });

    card.aiRemark = { text: generated.text, model: generated.model, generatedAt: new Date(), edited: false };
    await card.save();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'report_card.remark_regenerated', resource: 'report_card',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return card;
  },

  async update(id: string, rawInput: unknown, ctx: AuthContext): Promise<IReportCard> {
    const data = updateReportCardSchema.parse(rawInput);
    const card = await reportCardRepository.findById(id, ctx.schoolId);
    if (!card) throw new NotFoundError('Report card');

    if (data.aiRemarkText !== undefined) {
      card.aiRemark = { text: data.aiRemarkText, edited: true, generatedAt: card.aiRemark?.generatedAt, model: card.aiRemark?.model };
    }
    if (data.teacherRemark !== undefined) card.teacherRemark = data.teacherRemark;
    if (data.principalRemark !== undefined) card.principalRemark = data.principalRemark;
    if (data.parentFeedback !== undefined) card.parentFeedback = data.parentFeedback;
    if (data.coScholastic !== undefined) card.coScholastic = data.coScholastic as ICoScholasticEntry[];

    await card.save();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'report_card.updated', resource: 'report_card',
      resourceId: id, details: { changed: Object.keys(data) }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return card;
  },

  async publish(id: string, ctx: AuthContext): Promise<IReportCard> {
    const card = await reportCardRepository.findById(id, ctx.schoolId);
    if (!card) throw new NotFoundError('Report card');
    card.status = 'published';
    await card.save();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'report_card.published', resource: 'report_card',
      resourceId: id, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return card;
  },

  /** Class roster for the "pick a student" screen — flags whether each
   *  student already has marks entered for every subject in this exam. */
  async getRoster(rawQuery: unknown, ctx: AuthContext): Promise<{
    exam: IExam;
    rows: { studentId: string; fullName: string; rollNumber?: string; photoUrl?: string; hasReportCard: boolean; missingSubjects: number }[];
  }> {
    const query = rosterQuerySchema.parse(rawQuery);
    const exam = await examRepository.findById(query.examId, ctx.schoolId);
    if (!exam) throw new NotFoundError('Exam');

    const students = await Student.find({ schoolId: ctx.schoolId, class: query.class, section: query.section, admissionStatus: 'active', isDeleted: false })
      .select('_id fullName rollNumber photoUrl')
      .sort({ rollNumber: 1, fullName: 1 })
      .lean<{ _id: unknown; fullName: string; rollNumber?: string; photoUrl?: string }[]>();

    const existingCards = await reportCardRepository.findByClassExam(ctx.schoolId, query.examId, query.class, query.section);
    const cardByStudent = new Map(existingCards.map((c) => [c.studentId, c]));

    const rows = await Promise.all(students.map(async (s) => {
      const studentId = String(s._id);
      const marksRecords = await marksRepository.findByStudentExam(ctx.schoolId, query.examId, studentId);
      const marksBySubject = new Set(marksRecords.filter((m) => m.result !== 'na').map((m) => m.subjectName));
      const missingSubjects = exam.subjects.filter((sub) => !marksBySubject.has(sub)).length;

      return {
        studentId,
        fullName: s.fullName,
        rollNumber: s.rollNumber,
        photoUrl: s.photoUrl,
        hasReportCard: cardByStudent.has(studentId),
        missingSubjects,
      };
    }));

    return { exam, rows };
  },
};
