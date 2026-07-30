import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { aiUsageRepository } from '../ai/ai.repository';
import { ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { logger } from '../../lib/logger';

export interface LessonPlanContent {
  objective: string;
  introduction: string;
  explanation: string;
  activities: string[];
  examples: string[];
  questions: string[];
  homework: string;
  assessment: string;
}

export interface GenerateLessonPlanInput {
  class: string;
  subject: string;
  chapterName: string;
  topic?: string;
  durationMinutes: number;
}

interface RawLessonPlan {
  objective?: string | null;
  introduction?: string | null;
  explanation?: string | null;
  activities?: string[] | null;
  examples?: string[] | null;
  questions?: string[] | null;
  homework?: string | null;
  assessment?: string | null;
}

function buildSystemPrompt(input: GenerateLessonPlanInput): string {
  return `You are an experienced school teacher writing a lesson plan for Class ${input.class} ${input.subject}, chapter "${input.chapterName}"${input.topic ? `, topic "${input.topic}"` : ''}, for a ${input.durationMinutes}-minute period.

Return a JSON object with:
- "objective": one or two sentences stating what students should be able to do by the end of the lesson
- "introduction": a short hook/warm-up activity to open the lesson (2-4 sentences)
- "explanation": the core teaching content, written as a clear, well-organized explanation a teacher can read from or paraphrase (3-6 sentences or short paragraphs)
- "activities": array of 2-4 short in-class activity descriptions
- "examples": array of 2-3 concrete worked examples or illustrations relevant to the topic
- "questions": array of 3-5 quick check-for-understanding questions to ask during/after the lesson
- "homework": one or two sentences describing homework to assign
- "assessment": one or two sentences describing how to informally assess whether students met the objective

Keep the whole plan realistic for a ${input.durationMinutes}-minute class. Return ONLY the JSON object, no markdown, no explanation.`;
}

function parse(raw: string): RawLessonPlan {
  try {
    return JSON.parse(raw);
  } catch (err) {
    logger.error('[LessonPlanGenerator] Failed to parse AI response', { error: String(err), raw: raw.slice(0, 500) });
    throw new ValidationError('Could not generate a lesson plan — try again.');
  }
}

function clean(raw: RawLessonPlan): LessonPlanContent {
  return {
    objective: raw.objective?.trim() || '',
    introduction: raw.introduction?.trim() || '',
    explanation: raw.explanation?.trim() || '',
    activities: Array.isArray(raw.activities) ? raw.activities.filter((a) => a?.trim()) : [],
    examples: Array.isArray(raw.examples) ? raw.examples.filter((e) => e?.trim()) : [],
    questions: Array.isArray(raw.questions) ? raw.questions.filter((q) => q?.trim()) : [],
    homework: raw.homework?.trim() || '',
    assessment: raw.assessment?.trim() || '',
  };
}

export const lessonPlanGeneratorService = {
  async generate(input: GenerateLessonPlanInput, ctx: AuthContext): Promise<LessonPlanContent> {
    if (!openaiProvider.isAvailable()) {
      throw new ValidationError('AI generation is not configured on this server.');
    }

    const start = Date.now();
    const result = await openaiProvider.complete({
      systemPrompt: buildSystemPrompt(input),
      userPrompt: `Write the lesson plan.`,
      temperature: 0.5,
      maxTokens: 1800,
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

    const content = clean(parse(result.content));
    if (!content.objective || !content.explanation) {
      throw new ValidationError('The AI response was incomplete — try again.');
    }
    return content;
  },
};
