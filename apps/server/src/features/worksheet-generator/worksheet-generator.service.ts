import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { aiUsageRepository } from '../ai/ai.repository';
import { chapterRepository } from '../question-bank/chapter.repository';
import { questionRepository } from '../question-bank/question.repository';
import { IQuestion, QuestionType, QuestionDifficulty, BloomsLevel } from '../question-bank/question.model';
import { AuthContext } from '../../lib/auth-context';
import { ValidationError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';
import { WORKSHEET_PRESETS } from './worksheet-preset';
import { WorksheetType, IWorksheetQuestion } from './worksheet.model';

export interface GenerateWorksheetInput {
  class: string;
  subject: string;
  chapterIds: string[];
  worksheetType: WorksheetType;
  questionCount: number;
}

export interface WorksheetQuestionDraft extends IWorksheetQuestion {
  isNew?: boolean;
}

interface RawAuthoredQuestion {
  questionText?: string | null;
  questionType?: string | null;
  options?: string[] | null;
  difficulty?: string | null;
  estimatedTimeMinutes?: number | string | null;
  keywords?: string[] | null;
}

const QUESTION_TYPES: QuestionType[] = [
  'mcq', 'fill_blank', 'true_false', 'assertion_reason', 'very_short', 'short', 'long', 'hots', 'case_study',
];
const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

function matchesPreset(q: IQuestion, preset: { difficulties: QuestionDifficulty[]; questionTypes: QuestionType[]; bloomsLevels: BloomsLevel[] }): boolean {
  if (preset.difficulties.length > 0 && !preset.difficulties.includes(q.difficulty)) return false;
  if (preset.questionTypes.length > 0 && !preset.questionTypes.includes(q.questionType)) return false;
  if (preset.bloomsLevels.length > 0 && !preset.bloomsLevels.includes(q.bloomsLevel)) return false;
  return true;
}

function toWorksheetQuestion(q: IQuestion): IWorksheetQuestion {
  return {
    questionId: String(q._id),
    questionText: q.questionText,
    questionType: q.questionType,
    options: q.options,
    difficulty: q.difficulty,
    estimatedTimeMinutes: q.estimatedTimeMinutes,
    keywords: q.keywords,
  };
}

function buildAuthoringPrompt(input: GenerateWorksheetInput, chapterNames: string[], count: number): string {
  const preset = WORKSHEET_PRESETS[input.worksheetType];
  // A preset with exactly one allowed difficulty (olympiad → hard, remedial → easy) is a hard
  // requirement, not a suggestion — without spelling that out the model tends to judge a chapter
  // "too basic/advanced" for the requested level and quietly writes an easier/harder question
  // instead, or returns fewer than asked, which is how a teacher ends up with a "hard" worksheet
  // that isn't actually hard. Force it explicitly and forbid refusing/downgrading.
  const forcedDifficulty = preset.difficulties.length === 1 ? preset.difficulties[0] : undefined;

  return `You are an experienced school teacher writing ${count} new questions for a ${preset.label} for Class ${input.class} ${input.subject}, covering: ${chapterNames.join(', ')}.

Write ${preset.authoringGuidance}.
${forcedDifficulty ? `\nEvery single question MUST be "${forcedDifficulty}" difficulty — that is what this worksheet type requires. If the chapter content looks too simple or too advanced to naturally reach "${forcedDifficulty}", stretch the question yourself (deeper application, multi-step reasoning, an unfamiliar angle on the same concept) rather than writing an easier/harder one or skipping it. Return all ${count} questions at "${forcedDifficulty}" difficulty — never fewer.\n` : ''}
For each question, return:
- "questionText": the question
- "questionType": one of ${QUESTION_TYPES.map((t) => `"${t}"`).join(', ')}
- "options": array of option strings, only if questionType is "mcq"
- "difficulty": ${forcedDifficulty ? `must be exactly "${forcedDifficulty}"` : `one of ${DIFFICULTIES.map((d) => `"${d}"`).join(', ')}`}
- "estimatedTimeMinutes": estimated minutes a student would need
- "keywords": 2-4 key terms from the question

Return ONLY a valid JSON object: {"questions": [...]}. No markdown, no explanation.`;
}

function parseAuthored(raw: string): RawAuthoredQuestion[] {
  try {
    const body = JSON.parse(raw);
    const questions = Array.isArray(body) ? body : body.questions;
    return Array.isArray(questions) ? questions : [];
  } catch (err) {
    logger.error('[WorksheetGenerator] Failed to parse AI response', { error: String(err), raw: raw.slice(0, 500) });
    throw new ValidationError('Could not author new questions — try again.');
  }
}

// `forcedDifficulty` is passed for presets with exactly one allowed difficulty (olympiad → hard,
// remedial → easy) — the prompt already asks for it, but the model's self-reported "difficulty"
// field is normalized here too, in case it drifts, so a requested difficulty is never silently
// swapped for an easier/harder one.
function cleanAuthored(raw: RawAuthoredQuestion[], forcedDifficulty?: QuestionDifficulty): WorksheetQuestionDraft[] {
  return raw
    .filter((q) => q.questionText?.trim())
    .map((q) => {
      const timeNum = typeof q.estimatedTimeMinutes === 'string' ? Number(q.estimatedTimeMinutes) : q.estimatedTimeMinutes;
      return {
        questionText: q.questionText!.trim(),
        questionType: QUESTION_TYPES.includes(q.questionType as QuestionType) ? (q.questionType as QuestionType) : 'short',
        options: Array.isArray(q.options) ? q.options : undefined,
        difficulty: forcedDifficulty ?? (DIFFICULTIES.includes(q.difficulty as QuestionDifficulty) ? (q.difficulty as QuestionDifficulty) : 'medium'),
        estimatedTimeMinutes: typeof timeNum === 'number' && !Number.isNaN(timeNum) ? timeNum : 3,
        keywords: Array.isArray(q.keywords) ? q.keywords : [],
        isNew: true,
      };
    });
}

export const worksheetGeneratorService = {
  async generate(input: GenerateWorksheetInput, ctx: AuthContext): Promise<{ chapterNames: string[]; questions: WorksheetQuestionDraft[] }> {
    const chapters = await chapterRepository.findByIds(ctx.schoolId, input.chapterIds);
    if (chapters.length === 0) throw new ValidationError('No matching chapters found for this class/subject');
    const chapterNames = chapters.map((c) => c.chapterName);

    const preset = WORKSHEET_PRESETS[input.worksheetType];
    const pool = await questionRepository.findEligible(ctx.schoolId, input.class, input.subject, input.chapterIds);
    const eligible = pool.filter((q) => matchesPreset(q, preset));

    eligible.sort((a, b) => a.usageHistory.length - b.usageHistory.length);
    const selected = eligible.slice(0, input.questionCount).map(toWorksheetQuestion);

    const shortfall = input.questionCount - selected.length;
    let authored: WorksheetQuestionDraft[] = [];

    const forcedDifficulty = preset.difficulties.length === 1 ? preset.difficulties[0] : undefined;

    if (shortfall > 0) {
      if (!openaiProvider.isAvailable()) {
        throw new ValidationError(`Only ${selected.length}/${input.questionCount} questions found in the bank, and AI authoring is not configured to fill the rest.`);
      }

      // The AI is told to always return the full count, but if it still undershoots (e.g. the
      // model trims a "hard"/"olympiad" batch it judged too demanding for the chapter), ask again
      // for just the remainder rather than silently handing the teacher a shorter worksheet than
      // they picked — matches "give them at any cost" for difficulty-locked presets in particular.
      let stillNeeded = shortfall;
      for (let attempt = 0; attempt < 2 && stillNeeded > 0; attempt++) {
        const start = Date.now();
        const result = await openaiProvider.complete({
          systemPrompt: buildAuthoringPrompt(input, chapterNames, stillNeeded),
          userPrompt: attempt === 0 ? 'Write the questions.' : `You returned fewer than ${stillNeeded} last time — write exactly ${stillNeeded} now, no fewer.`,
          temperature: 0.6,
          maxTokens: 2500,
          jsonResponse: true,
        });

        aiUsageRepository.record({
          provider: 'openai', aiModel: result.model, promptTokens: result.promptTokens, completionTokens: result.completionTokens,
          totalTokens: result.totalTokens, estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
          durationMs: Date.now() - start, schoolId: ctx.schoolId,
        });

        const batch = cleanAuthored(parseAuthored(result.content), forcedDifficulty);
        authored = [...authored, ...batch];
        stillNeeded = shortfall - authored.length;
      }
    }

    return { chapterNames, questions: [...selected, ...authored] };
  },
};
