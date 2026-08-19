import type { GenerateMockTestPayload, GenerateMockTestResult, GeneratedMockTestQuestion, QuestionDifficulty } from '@schoolos/types';
import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { aiUsageRepository } from '../ai/ai.repository';
import { ValidationError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';
import { chapterRepository } from '../question-bank/chapter.repository';
import { questionSourceRepository } from '../question-bank/question-source.repository';

// Single-chapter(-set) MCQ generation for the Mock Test Engine. Deliberately
// standalone from question-extraction.service.ts's batching machinery — a
// mock test tops out at MAX_QUESTIONS, well inside one completion's safe
// token budget, so the truncation-retry/chunking apparatus that file needs
// for "up to 100 questions across a 20-page upload" would be over-engineering
// here. If mock tests ever need to scale past that, lift the batching helpers
// from question-extraction.service.ts rather than duplicating them.

const MAX_QUESTIONS = 30;
const CONTEXT_CHAR_LIMIT = 14_000;
const TOKENS_PER_QUESTION = 220;
const BASE_TOKENS = 400;

interface RawMcqQuestion {
  questionText?: string | null;
  options?: string[] | null;
  correctOptionIndex?: number | string | null;
  marks?: number | string | null;
}

function buildPrompt(cls: string, subject: string, chapterNames: string[], count: number, difficulty: QuestionDifficulty | 'mixed'): string {
  const difficultyInstruction = difficulty === 'mixed' ? 'a mix of easy, medium, and hard difficulty' : `"${difficulty}" difficulty only`;
  return `You write multiple-choice questions (MCQ only) for a timed online mock test, for Class ${cls} ${subject}, covering the chapter(s): ${chapterNames.join(', ')}.

Use the reference material below as your syllabus content — do not invent facts outside it. Write exactly ${count} MCQ question(s), at ${difficultyInstruction}. Each question must have exactly 4 options, with exactly one correct answer.

For each question, return:
- "questionText": the full question text
- "options": an array of exactly 4 option strings
- "correctOptionIndex": the 0-based index (0-3) of the correct option in "options"
- "marks": marks this question is worth (a number, typically 1)

Return ONLY a valid JSON object: {"questions": [...]}. No markdown, no explanation.`;
}

function clean(raw: RawMcqQuestion[]): GeneratedMockTestQuestion[] {
  const out: GeneratedMockTestQuestion[] = [];
  for (const q of raw) {
    if (!q.questionText?.trim()) continue;
    const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [];
    if (options.length < 2) continue;
    const idxNum = typeof q.correctOptionIndex === 'string' ? Number(q.correctOptionIndex) : q.correctOptionIndex;
    if (typeof idxNum !== 'number' || Number.isNaN(idxNum) || idxNum < 0 || idxNum >= options.length) continue;
    const marksNum = typeof q.marks === 'string' ? Number(q.marks) : q.marks;
    out.push({
      questionText: q.questionText.trim(),
      options,
      correctOptionIndex: idxNum,
      marks: typeof marksNum === 'number' && !Number.isNaN(marksNum) && marksNum > 0 ? marksNum : 1,
    });
  }
  return out;
}

export const mockTestGenerationService = {
  async generate(payload: GenerateMockTestPayload): Promise<GenerateMockTestResult> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI generation is not configured on this server (missing OPENAI_API_KEY).');
    }

    const count = Math.min(MAX_QUESTIONS, Math.max(1, payload.questionCount));

    const chapters = await chapterRepository.findByIds(payload.schoolId, payload.chapterIds);
    if (chapters.length === 0) {
      throw new ValidationError('No matching chapters found for this class/subject — pick already-captured chapters from the Question Bank.');
    }
    const chapterNames = chapters.map((c) => c.chapterName);

    const sources = await questionSourceRepository.findAll(payload.schoolId, payload.class, payload.subject).catch(() => []);
    const relevantSources = sources.filter((s) => chapterNames.some((name) => (s.chapterName ?? '').toLowerCase() === name.toLowerCase()));
    const contextText = (relevantSources.length > 0 ? relevantSources : sources)
      .map((s) => s.extractedText)
      .join('\n\n')
      .slice(0, CONTEXT_CHAR_LIMIT);

    if (!contextText.trim()) {
      throw new ValidationError('The selected chapter(s) have no captured source text yet — capture the chapter in Question Bank first.');
    }

    const systemPrompt = buildPrompt(payload.class, payload.subject, chapterNames, count, payload.difficulty);
    const start = Date.now();
    const maxTokens = Math.min(6000, count * TOKENS_PER_QUESTION + BASE_TOKENS);

    const result = await openaiProvider.complete({
      systemPrompt,
      userPrompt: `Reference material:\n\n${contextText}`,
      temperature: 0.3,
      maxTokens,
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
      schoolId: payload.schoolId,
    });

    let questions: GeneratedMockTestQuestion[] = [];
    const warnings: string[] = [];
    try {
      const body = JSON.parse(result.content) as { questions?: RawMcqQuestion[] };
      questions = clean(Array.isArray(body.questions) ? body.questions : []);
    } catch (err) {
      logger.error('[MockTestGeneration] Failed to parse AI response', { error: String(err), raw: result.content.slice(0, 500) });
      throw new ValidationError('Could not generate MCQ questions from that chapter — try again.');
    }

    if (questions.length === 0) {
      throw new ValidationError('The AI did not return any usable MCQ questions for this chapter — try again or pick a different chapter.');
    }
    if (questions.length < count) {
      warnings.push(`Generated ${questions.length} of the ${count} requested question(s).`);
    }

    return { class: payload.class, subject: payload.subject, chapterIds: payload.chapterIds, chapterNames, questions, warnings };
  },
};
