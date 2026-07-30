import { PDFParse } from 'pdf-parse';
import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { aiUsageRepository } from '../ai/ai.repository';
import { chapterRepository } from '../question-bank/chapter.repository';
import { ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';
import { computeTeachingWeeks } from './planner-week.util';
import { plannerExtractionJobRepository } from './extraction-job.repository';
import { PlannerTaskType } from './planner.model';

// ── Output shapes ──────────────────────────────────────────────────────────────

export interface PlannerDraftTask {
  title: string;
  type: PlannerTaskType;
}

export interface PlannerDraftWeek {
  weekNumber: number;
  chapterName: string;
  topic?: string;
  tasks: PlannerDraftTask[];
}

export interface PlannerExtractionResult {
  sourceType: 'image' | 'pdf_text';
  totalTeachingWeeks: number;
  weeks: PlannerDraftWeek[];
  warnings: string[];
}

interface RawDraftTask {
  title?: string | null;
  type?: string | null;
}

interface RawDraftWeek {
  weekNumber?: number | string | null;
  chapterName?: string | null;
  topic?: string | null;
  tasks?: RawDraftTask[] | null;
}

const TASK_TYPES: PlannerTaskType[] = [
  'explain', 'activity', 'worksheet', 'homework', 'doubt_session', 'revision', 'unit_test', 'other',
];

function buildSystemPrompt(cls: string, subject: string, totalWeeks: number, existingChapters: string[]): string {
  return `You read a teacher's annual planner, syllabus, or academic calendar for Class ${cls} ${subject} and convert it into a week-by-week teaching schedule.

There are exactly ${totalWeeks} teaching weeks available this academic year, numbered 1 to ${totalWeeks}. Assign each chapter/topic block to one or more consecutive week numbers based on how the source document sequences the syllabus — do not invent extra weeks beyond ${totalWeeks} and do not compute or output any dates, only week numbers.

${existingChapters.length > 0 ? `These chapters already exist for this class/subject — reuse the exact same name when the document refers to one of them: ${existingChapters.join(', ')}.` : ''}

For each week you can confidently assign content to, return:
- "weekNumber": integer from 1 to ${totalWeeks}
- "chapterName": the chapter being taught that week
- "topic": the specific topic within the chapter, if identifiable
- "tasks": an array of 3-6 teaching tasks for that week, each with:
  - "title": short task description (e.g. "Explain Photosynthesis", "Conduct Activity", "Give Worksheet", "Unit Test")
  - "type": one of ${TASK_TYPES.map((t) => `"${t}"`).join(', ')}

Return ONLY a valid JSON object: {"weeks": [...]}. No markdown, no explanation. Skip weeks you have no information about rather than guessing content.`;
}

function parseWeeks(raw: string): RawDraftWeek[] {
  try {
    const body = JSON.parse(raw);
    const weeks = Array.isArray(body) ? body : body.weeks;
    if (!Array.isArray(weeks)) return [];
    return weeks;
  } catch (err) {
    logger.error('[PlannerExtraction] Failed to parse AI response', { error: String(err), raw: raw.slice(0, 500) });
    throw new ValidationError('Could not read a schedule from that upload — try a clearer photo or a different file.');
  }
}

function clean(raw: RawDraftWeek[], totalWeeks: number): { weeks: PlannerDraftWeek[]; warnings: string[] } {
  const weeks: PlannerDraftWeek[] = [];
  const warnings: string[] = [];

  for (const w of raw) {
    const weekNumberRaw = typeof w.weekNumber === 'string' ? Number(w.weekNumber) : w.weekNumber;
    if (typeof weekNumberRaw !== 'number' || Number.isNaN(weekNumberRaw) || weekNumberRaw < 1 || weekNumberRaw > totalWeeks) {
      warnings.push(`Skipped a week entry with an invalid week number (${w.weekNumber ?? 'missing'}).`);
      continue;
    }
    if (!w.chapterName?.trim()) {
      warnings.push(`Week ${weekNumberRaw} had no identifiable chapter — please assign one before saving.`);
      continue;
    }

    const tasks: PlannerDraftTask[] = (w.tasks ?? [])
      .filter((t): t is RawDraftTask => !!t?.title?.trim())
      .map((t) => ({
        title: t.title!.trim(),
        type: TASK_TYPES.includes(t.type as PlannerTaskType) ? (t.type as PlannerTaskType) : 'other',
      }));

    weeks.push({ weekNumber: weekNumberRaw, chapterName: w.chapterName.trim(), topic: w.topic ?? undefined, tasks });
  }

  weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  return { weeks, warnings };
}

async function loadContext(schoolId: string, cls: string, subject: string, academicYearStart: Date, academicYearEnd: Date) {
  const [teachingWeeks, chapters] = await Promise.all([
    computeTeachingWeeks(schoolId, academicYearStart, academicYearEnd),
    chapterRepository.findAll(schoolId, cls, subject),
  ]);
  return { totalWeeks: teachingWeeks.length, existingChapterNames: chapters.map((c) => c.chapterName) };
}

export const plannerExtractionService = {
  async extractFromImage(
    cls: string, subject: string, academicYearStart: Date, academicYearEnd: Date, imageDataUri: string, ctx: AuthContext,
  ): Promise<PlannerExtractionResult> {
    if (!openaiProvider.isAvailable()) throw new ValidationError('AI extraction is not configured on this server.');

    const { totalWeeks, existingChapterNames } = await loadContext(ctx.schoolId, cls, subject, academicYearStart, academicYearEnd);
    if (totalWeeks === 0) throw new ValidationError('No teaching weeks in the configured academic year range — check School Settings.');

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(cls, subject, totalWeeks, existingChapterNames),
      userPrompt: 'Read this annual planner / syllabus page and map its content onto the teaching weeks.',
      imageDataUri,
      temperature: 0.2,
      maxTokens: 4000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai', aiModel: result.model, promptTokens: result.promptTokens, completionTokens: result.completionTokens,
      totalTokens: result.totalTokens, estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start, schoolId: ctx.schoolId,
    });

    const { weeks, warnings } = clean(parseWeeks(result.content), totalWeeks);
    return { sourceType: 'image', totalTeachingWeeks: totalWeeks, weeks, warnings };
  },

  async extractFromPdf(
    cls: string, subject: string, academicYearStart: Date, academicYearEnd: Date, pdfBuffer: Buffer, ctx: AuthContext,
  ): Promise<PlannerExtractionResult> {
    if (!openaiProvider.isAvailable()) throw new ValidationError('AI extraction is not configured on this server.');

    const { totalWeeks, existingChapterNames } = await loadContext(ctx.schoolId, cls, subject, academicYearStart, academicYearEnd);
    if (totalWeeks === 0) throw new ValidationError('No teaching weeks in the configured academic year range — check School Settings.');

    const parser = new PDFParse({ data: pdfBuffer });
    const { text } = await parser.getText();
    await parser.destroy();

    if (!text.trim() || text.trim().length < 20) {
      throw new ValidationError('This PDF has no readable text layer (likely scanned) — upload photos of its pages instead.');
    }

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(cls, subject, totalWeeks, existingChapterNames),
      userPrompt: `Map this document's content onto the teaching weeks:\n\n${text.slice(0, 15000)}`,
      temperature: 0.2,
      maxTokens: 4000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai', aiModel: result.model, promptTokens: result.promptTokens, completionTokens: result.completionTokens,
      totalTokens: result.totalTokens, estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start, schoolId: ctx.schoolId,
    });

    const { weeks, warnings } = clean(parseWeeks(result.content), totalWeeks);
    return { sourceType: 'pdf_text', totalTeachingWeeks: totalWeeks, weeks, warnings };
  },

  async enqueueExtractFromImage(
    cls: string, subject: string, academicYearStart: Date, academicYearEnd: Date, imageDataUri: string, ctx: AuthContext,
  ): Promise<{ jobId: string }> {
    const job = await plannerExtractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'image' });
    const jobId = job._id.toString();

    plannerExtractionService.extractFromImage(cls, subject, academicYearStart, academicYearEnd, imageDataUri, ctx)
      .then((result) => plannerExtractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[PlannerExtraction] Background image extraction failed', { jobId, err });
        plannerExtractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
      });

    return { jobId };
  },

  async enqueueExtractFromPdf(
    cls: string, subject: string, academicYearStart: Date, academicYearEnd: Date, pdfBuffer: Buffer, ctx: AuthContext,
  ): Promise<{ jobId: string }> {
    const job = await plannerExtractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'pdf_text' });
    const jobId = job._id.toString();

    plannerExtractionService.extractFromPdf(cls, subject, academicYearStart, academicYearEnd, pdfBuffer, ctx)
      .then((result) => plannerExtractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[PlannerExtraction] Background PDF extraction failed', { jobId, err });
        plannerExtractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
      });

    return { jobId };
  },

  async getExtractionJob(jobId: string, ctx: AuthContext) {
    const job = await plannerExtractionJobRepository.findById(jobId, ctx.schoolId);
    if (!job) throw new ValidationError('Extraction job not found or expired');
    if (job.userId !== ctx.userId) throw new ValidationError('Extraction job not found or expired');
    return { status: job.status, result: job.result, error: job.error };
  },
};
