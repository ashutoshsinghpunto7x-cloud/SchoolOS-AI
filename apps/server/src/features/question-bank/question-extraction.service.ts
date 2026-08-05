import { PDFParse } from 'pdf-parse';
import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { aiUsageRepository } from '../ai/ai.repository';
import { ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';
import { extractionJobRepository } from './extraction-job.repository';
import { questionSourceRepository } from './question-source.repository';
import { IQuestionSource } from './question-source.model';
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
  /** Id of the permanent QuestionSource row this upload's converted text was saved under — pass to re-extraction to reuse it without re-uploading. */
  sourceId?: string;
}

/** Result of an upload that only transcribes/stores text — no question structuring happens yet. */
export interface TextExtractionResult {
  sourceId: string;
  sourceType: 'image' | 'pdf_text';
  fileName?: string;
  extractedText: string;
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

Also return "pageText": the full raw text of everything readable on the page, transcribed verbatim, so it can be cached and re-used later.

Return ONLY a valid JSON object: {"pageText": "...", "questions": [...]}. No markdown, no explanation. Skip anything that is not actually a question (headings, instructions, page numbers).`;
}

/**
 * Asks the model to write brand-new questions for a chapter, rather than extract them from a page.
 * Used by the paper generator when the bank doesn't have enough questions at a requested marks
 * value — the model must never refuse for "not enough content"; it should combine/extend the
 * chapter's concepts (multi-part, detailed-answer, etc.) to legitimately reach the requested marks.
 */
function buildSynthesisPrompt(cls: string, subject: string, chapterName: string, marks: number, count: number, questionType?: QuestionType): string {
  return `You are writing ${count} new, original exam question(s) for Class ${cls} ${subject}, chapter "${chapterName}", each worth exactly ${marks} mark(s)${questionType ? ` and of question type "${questionType}"` : ''}.

Use the reference material below (existing questions and/or textbook excerpts from this chapter) as your syllabus content — do not invent facts outside it. You must always produce exactly ${count} question(s) worth ${marks} marks each, no matter how little reference material is given. Never refuse or claim there isn't enough content for the requested mark value: if the chapter's material is thin for a high-mark question, write a multi-part or detailed-answer question (e.g. "Explain X. Give two examples. What is its significance?") that legitimately deserves ${marks} marks by combining and extending the chapter's concepts.

For each question, return the same JSON shape used for extraction:
- "questionText", "questionType", "options" (only for mcq), "correctAnswer" (if applicable)
- "difficulty": one of ${DIFFICULTIES.map((d) => `"${d}"`).join(', ')}
- "marks": must be exactly ${marks}
- "estimatedTimeMinutes", "bloomsLevel": one of ${BLOOMS_LEVELS.map((b) => `"${b}"`).join(', ')}
- "keywords": 2-5 key terms
- "chapterName": "${chapterName}"
- "topic": the specific topic within the chapter, if identifiable

Return ONLY a valid JSON object: {"questions": [...]}. No markdown, no explanation.`;
}

/** Transcription-only prompt used on upload — cheaper/faster than buildSystemPrompt since it skips question structuring entirely; that happens later, on demand, via structureFromText. */
function buildTranscribePrompt(): string {
  return `You transcribe everything readable on a school textbook page, worksheet, or exam paper photo into plain text, verbatim, preserving question numbering and structure as line breaks.

Return ONLY a valid JSON object: {"pageText": "..."}. No markdown, no explanation, no commentary — just the transcribed text.`;
}

function parseQuestions(raw: string): { questions: RawExtractedQuestion[]; pageText: string } {
  try {
    const body = JSON.parse(raw);
    const questions = Array.isArray(body) ? body : body.questions;
    const pageText = typeof body?.pageText === 'string' ? body.pageText : '';
    if (!Array.isArray(questions)) return { questions: [], pageText };
    return { questions, pageText };
  } catch (err) {
    logger.error('[QuestionExtraction] Failed to parse AI response', { error: String(err), raw: raw.slice(0, 500) });
    throw new ValidationError('Could not read questions from that upload — try a clearer photo or a different file.');
  }
}

function parseTranscription(raw: string): string {
  try {
    const body = JSON.parse(raw);
    return typeof body?.pageText === 'string' ? body.pageText : '';
  } catch (err) {
    logger.error('[QuestionExtraction] Failed to parse transcription response', { error: String(err), raw: raw.slice(0, 500) });
    throw new ValidationError('Could not read that photo — try a clearer picture.');
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
  /** Upload → transcribe + store text only. Question structuring is a separate, repeatable step — see structureFromText/enqueueReExtractFromSource. */
  async extractFromImage(
    cls: string, subject: string, imageDataUri: string, ctx: AuthContext, fileName?: string,
  ): Promise<TextExtractionResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI extraction is not configured on this server.');
    }

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildTranscribePrompt(),
      userPrompt: 'Transcribe everything readable on this page.',
      imageDataUri,
      temperature: 0.1,
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

    const pageText = parseTranscription(result.content);
    if (!pageText.trim()) {
      // QuestionSource.extractedText is a required field — an empty string still fails Mongoose's
      // required check, so this has to be rejected here rather than saved as a blank source.
      throw new ValidationError('No readable text was found on that page — try a clearer photo.');
    }

    const source = await questionSourceRepository.create({
      schoolId: ctx.schoolId, userId: ctx.userId, class: cls, subject, kind: 'image', fileName,
      extractedText: pageText,
    });

    return { sourceId: String(source._id), sourceType: 'image', fileName, extractedText: pageText, warnings: [] };
  },

  /** Upload → extract + store text only (local PDF text layer, no AI call). Question structuring is a separate, repeatable step. */
  async extractFromPdf(
    cls: string, subject: string, pdfBuffer: Buffer, ctx: AuthContext, fileName?: string,
  ): Promise<TextExtractionResult> {
    const parser = new PDFParse({ data: pdfBuffer });
    const { text } = await parser.getText();
    await parser.destroy();

    if (!text.trim() || text.trim().length < 20) {
      throw new ValidationError(
        'This PDF has no readable text layer (likely a scanned document) — upload photos of its pages instead.',
      );
    }

    const source = await questionSourceRepository.create({
      schoolId: ctx.schoolId, userId: ctx.userId, class: cls, subject, kind: 'pdf_text', fileName,
      extractedText: text,
    });

    return { sourceId: String(source._id), sourceType: 'pdf_text', fileName, extractedText: text, warnings: [] };
  },

  /** Re-runs AI structuring over previously-saved converted text — no re-upload/re-OCR needed. */
  async extractFromSourceText(source: IQuestionSource, ctx: AuthContext): Promise<QuestionExtractionResult> {
    const { extracted, warnings } = await questionExtractionService.structureFromText(
      source.class, source.subject, source.extractedText, ctx,
    );
    // A teacher-assigned chapter on the source overrides the AI's per-question guess —
    // it's a more reliable signal than inferring the chapter from page content alone.
    const withChapter = source.chapterName
      ? extracted.map((q) => ({ ...q, chapterName: source.chapterName! }))
      : extracted;
    return { sourceType: source.kind, extracted: withChapter, warnings, sourceId: String(source._id) };
  },

  /** Shared AI call: turns raw page/document text into structured question drafts. */
  async structureFromText(
    cls: string, subject: string, text: string, ctx: AuthContext,
  ): Promise<{ extracted: ExtractedQuestionDraft[]; warnings: string[] }> {
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

    const { questions } = parseQuestions(result.content);
    return clean(questions);
  },

  /**
   * Writes brand-new questions for a chapter/marks-value gap the bank can't fill from existing
   * content — see buildSynthesisPrompt. Called by the paper generator, never blocks on "not enough
   * content"; returns [] only if AI isn't configured or the call itself fails, letting the caller
   * decide how to degrade further rather than hard-failing paper generation.
   */
  async synthesizeQuestions(
    req: { class: string; subject: string; chapterName: string; marks: number; count: number; questionType?: QuestionType; contextText: string },
    ctx: AuthContext,
  ): Promise<ExtractedQuestionDraft[]> {
    if (!openaiProvider.isAvailable() || req.count <= 0) return [];

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSynthesisPrompt(req.class, req.subject, req.chapterName, req.marks, req.count, req.questionType),
      userPrompt: `Reference material for this chapter:\n\n${req.contextText.slice(0, 6000) || '(no prior questions or uploads yet for this chapter — use general syllabus knowledge for this class/subject/chapter)'}`,
      temperature: 0.4,
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

    const { questions } = parseQuestions(result.content);
    const { extracted } = clean(questions);
    // The model is asked for exact marks/chapter/type, but normalize here too in case it drifts.
    return extracted.slice(0, req.count).map((q) => ({
      ...q,
      marks: req.marks,
      chapterName: req.chapterName,
      questionType: req.questionType ?? q.questionType,
    }));
  },

  async enqueueExtractFromImage(
    cls: string, subject: string, imageDataUri: string, ctx: AuthContext, fileName?: string,
  ): Promise<{ jobId: string }> {
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'image' });
    const jobId = job._id.toString();

    questionExtractionService.extractFromImage(cls, subject, imageDataUri, ctx, fileName)
      .then((result) => extractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[QuestionExtraction] Background image extraction failed', { jobId, err });
        extractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
      });

    return { jobId };
  },

  async enqueueExtractFromPdf(
    cls: string, subject: string, pdfBuffer: Buffer, ctx: AuthContext, fileName?: string,
  ): Promise<{ jobId: string }> {
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: 'pdf_text' });
    const jobId = job._id.toString();

    questionExtractionService.extractFromPdf(cls, subject, pdfBuffer, ctx, fileName)
      .then((result) => extractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[QuestionExtraction] Background PDF extraction failed', { jobId, err });
        extractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
      });

    return { jobId };
  },

  /** Re-extraction job over an already-saved QuestionSource — caller (question-bank.service) has already checked ownership/scope. */
  async enqueueReExtractFromSource(source: IQuestionSource, ctx: AuthContext): Promise<{ jobId: string }> {
    const job = await extractionJobRepository.create({ schoolId: ctx.schoolId, userId: ctx.userId, kind: source.kind });
    const jobId = job._id.toString();

    questionExtractionService.extractFromSourceText(source, ctx)
      .then((result) => extractionJobRepository.markCompleted(jobId, result))
      .catch((err) => {
        logger.error('[QuestionExtraction] Background re-extraction failed', { jobId, err });
        extractionJobRepository.markFailed(jobId, err instanceof Error ? err.message : 'Extraction failed').catch(() => {});
      });

    return { jobId };
  },

  async getExtractionJob(
    jobId: string, ctx: AuthContext,
  ): Promise<{ status: string; result?: TextExtractionResult | QuestionExtractionResult; error?: string }> {
    const job = await extractionJobRepository.findById(jobId, ctx.schoolId);
    if (!job) throw new ValidationError('Extraction job not found or expired');
    if (job.userId !== ctx.userId) throw new ValidationError('Extraction job not found or expired');
    return { status: job.status, result: job.result, error: job.error };
  },
};
