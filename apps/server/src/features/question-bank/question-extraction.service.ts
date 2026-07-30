import { PDFParse } from 'pdf-parse';
import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { aiUsageRepository } from '../ai/ai.repository';
import { ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';
import { extractionJobRepository } from './extraction-job.repository';
import { QuestionType, QuestionDifficulty, BloomsLevel } from './question.model';

// ── Output shapes ──────────────────────────────────────────────────────────────

export interface ExtractedQuestionDraft {
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  correctAnswer?: string;
  difficulty: QuestionDifficulty;
  marks: number;
  estimatedTimeMinutes: number;
  bloomsLevel: BloomsLevel;
  keywords: string[];
  chapterName: string;
  topic?: string;
  source?: string;
}

export interface QuestionExtractionResult {
  sourceType: 'image' | 'pdf_text';
  extracted: ExtractedQuestionDraft[];
  warnings: string[];
}

// ── Raw shape the model is asked to return ─────────────────────────────────────

interface RawExtractedQuestion {
  questionText?: string | null;
  questionType?: string | null;
  options?: string[] | null;
  correctAnswer?: string | null;
  difficulty?: string | null;
  marks?: number | string | null;
  estimatedTimeMinutes?: number | string | null;
  bloomsLevel?: string | null;
  keywords?: string[] | null;
  chapterName?: string | null;
  topic?: string | null;
  source?: string | null;
}

const QUESTION_TYPES: QuestionType[] = [
  'mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study',
];
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
const BLOOMS_LEVELS: BloomsLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

function buildSystemPrompt(cls: string, subject: string): string {
  return `You read school textbook pages, worksheets, or previous exam papers for Class ${cls} ${subject} and convert every question you find into structured JSON.

For each question, return:
- "questionText": the full question text
- "questionType": one of ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}
- "options": array of option strings, only if questionType is "mcq"
- "correctAnswer": the correct answer/option if it is visible on the page, else omit
- "difficulty": one of ${DIFFICULTIES.map((d) => `"${d}"`).join(', ')} — estimate based on the question's complexity
- "marks": the marks this question is worth (a number). If not stated, estimate a reasonable value based on question type and length
- "estimatedTimeMinutes": estimated minutes a student would need
- "bloomsLevel": one of ${BLOOMS_LEVELS.map((b) => `"${b}"`).join(', ')} — Bloom's Taxonomy level
- "keywords": 2-5 key terms from the question
- "chapterName": the chapter this question belongs to, if visible/inferable from the page (e.g. a heading), else your best guess from the content
- "topic": the specific topic within the chapter, if identifiable
- "source": where this came from if visible (e.g. "NCERT Page 54", "2024 Half Yearly Paper"), else omit

Return ONLY a valid JSON object: {"questions": [...]}. No markdown, no explanation. Skip anything that is not actually a question (headings, instructions, page numbers).`;
}

function parseQuestions(raw: string): RawExtractedQuestion[] {
  try {
    const body = JSON.parse(raw);
    const questions = Array.isArray(body) ? body : body.questions;
    if (!Array.isArray(questions)) return [];
    return questions;
  } catch (err) {
    logger.error('[QuestionExtraction] Failed to parse AI response', { error: String(err), raw: raw.slice(0, 500) });
    throw new ValidationError('Could not read questions from that upload — try a clearer photo or a different file.');
  }
}

function clean(entries: RawExtractedQuestion[]): { extracted: ExtractedQuestionDraft[]; warnings: string[] } {
  const extracted: ExtractedQuestionDraft[] = [];
  const warnings: string[] = [];

  for (const entry of entries) {
    if (!entry.questionText?.trim()) continue;

    const questionType = QUESTION_TYPES.includes(entry.questionType as QuestionType)
      ? (entry.questionType as QuestionType) : 'short';
    const difficulty = DIFFICULTIES.includes(entry.difficulty as QuestionDifficulty)
      ? (entry.difficulty as QuestionDifficulty) : 'medium';
    const bloomsLevel = BLOOMS_LEVELS.includes(entry.bloomsLevel as BloomsLevel)
      ? (entry.bloomsLevel as BloomsLevel) : 'understand';

    const marksNum = typeof entry.marks === 'string' ? Number(entry.marks) : entry.marks;
    const timeNum = typeof entry.estimatedTimeMinutes === 'string' ? Number(entry.estimatedTimeMinutes) : entry.estimatedTimeMinutes;

    if (!entry.chapterName?.trim()) {
      warnings.push(`"${entry.questionText.slice(0, 40)}…" had no identifiable chapter — please assign one before saving.`);
    }

    extracted.push({
      questionText: entry.questionText.trim(),
      questionType,
      options: Array.isArray(entry.options) ? entry.options : undefined,
      correctAnswer: entry.correctAnswer ?? undefined,
      difficulty,
      marks: typeof marksNum === 'number' && !Number.isNaN(marksNum) ? marksNum : 1,
      estimatedTimeMinutes: typeof timeNum === 'number' && !Number.isNaN(timeNum) ? timeNum : 2,
      bloomsLevel,
      keywords: Array.isArray(entry.keywords) ? entry.keywords : [],
      chapterName: entry.chapterName?.trim() || 'Unassigned',
      topic: entry.topic ?? undefined,
      source: entry.source ?? undefined,
    });
  }

  return { extracted, warnings };
}

// ── Service ────────────────────────────────────────────────────────────────────

export const questionExtractionService = {
  async extractFromImage(cls: string, subject: string, imageDataUri: string, ctx: AuthContext): Promise<QuestionExtractionResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(cls, subject),
      userPrompt: 'Read every question on this page and extract them.',
      imageDataUri,
      temperature: 0.2,
      maxTokens: 4000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start,
      schoolId: ctx.schoolId,
    });

    const { extracted, warnings } = clean(parseQuestions(result.content));
    return { sourceType: 'image', extracted, warnings };
  },

  async extractFromPdf(cls: string, subject: string, pdfBuffer: Buffer, ctx: AuthContext): Promise<QuestionExtractionResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }

    const parser = new PDFParse({ data: pdfBuffer });
    const { text } = await parser.getText();
    await parser.destroy();

    if (!text.trim() || text.trim().length < 20) {
      throw new ValidationError(
        'This PDF has no readable text layer (likely a scanned document) — upload photos of its pages instead.',
      );
    }

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(cls, subject),
      userPrompt: `Extract every question from this document text:\n\n${text.slice(0, 15000)}`,
      temperature: 0.2,
      maxTokens: 4000,
      jsonResponse: true,
    });

    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs: Date.now() - start,
      schoolId: ctx.schoolId,
    });

    const { extracted, warnings } = clean(parseQuestions(result.content));
    return { sourceType: 'pdf_text', extracted, warnings };
  },

  async enqueueExtractFromImage(cls: string, subject: string, imageDataUri: string, ctx: AuthContext): Promise<{ jobId: string }> {
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'image' });
    const jobId = job._id.toString();

    questionExtractionService.extractFromImage(cls, subject, imageDataUri, ctx)
      .then((result) => extractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[QuestionExtraction] Background image extraction failed', { jobId, err });
        extractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
      });

    return { jobId };
  },

  async enqueueExtractFromPdf(cls: string, subject: string, pdfBuffer: Buffer, ctx: AuthContext): Promise<{ jobId: string }> {
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'pdf_text' });
    const jobId = job._id.toString();

    questionExtractionService.extractFromPdf(cls, subject, pdfBuffer, ctx)
      .then((result) => extractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[QuestionExtraction] Background PDF extraction failed', { jobId, err });
        extractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
      });

    return { jobId };
  },

  async getExtractionJob(jobId: string, ctx: AuthContext) {
    const job = await extractionJobRepository.findById(jobId, ctx.schoolId);
    if (!job) throw new ValidationError('Extraction job not found or expired');
    if (job.userId !== ctx.userId) throw new ValidationError('Extraction job not found or expired');
    return { status: job.status, result: job.result, error: job.error };
  },
};
