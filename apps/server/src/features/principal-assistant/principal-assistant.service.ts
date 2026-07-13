import { openaiProvider } from '../ai/providers/llm/openai.provider';
import { chatSchema } from './principal-assistant.validation';
import { classifyIntent, recordUsage, UNSUPPORTED_INTENT } from './intent-router';
import { attendanceIntents } from './principal-assistant.intents';
import { buildFormattingSystemPrompt } from './principal-assistant.prompts';
import { AuthContext } from '../../lib/auth-context';
import { AppError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';

const UNSUPPORTED_REPLY =
  "I'm currently able to help with attendance-related questions only — things like today's " +
  'attendance summary, present/absent counts, or the highest/lowest attendance class. Could you ' +
  'rephrase your question around attendance?';

export const principalAssistantService = {
  async chat(rawInput: unknown, ctx: AuthContext): Promise<{ reply: string }> {
    const { message } = chatSchema.parse(rawInput);

    if (!openaiProvider.isAvailable()) {
      throw new AppError('AI Assistant is not configured. Please contact your administrator.', 503, 'AI_UNAVAILABLE');
    }

    // Step 1 — route the question to an attendance intent (or UNSUPPORTED).
    const { intentId, usage: routerUsage } = await classifyIntent(message, 'Attendance', attendanceIntents);
    recordUsage(routerUsage, ctx.schoolId);

    if (intentId === UNSUPPORTED_INTENT) {
      logger.info('[PrincipalAssistant] Unsupported intent', { schoolId: ctx.schoolId, message });
      return { reply: UNSUPPORTED_REPLY };
    }

    const intent = attendanceIntents.find((i) => i.id === intentId);
    if (!intent) {
      // Defensive: classifyIntent only returns ids from attendanceIntents or UNSUPPORTED.
      return { reply: UNSUPPORTED_REPLY };
    }

    // Step 2 — fetch only the data this intent needs (backend does all the math).
    const data = await intent.fetchData(ctx);

    // Step 3 — OpenAI formats the pre-computed data into a natural-language answer.
    const userPrompt = `Attendance data (JSON):\n${JSON.stringify(data, null, 2)}\n\nPrincipal's question: ${message}`;

    const result = await openaiProvider.complete({
      systemPrompt: buildFormattingSystemPrompt(),
      userPrompt,
      temperature: 0.4,
      maxTokens: 300,
    });
    recordUsage(result, ctx.schoolId);

    logger.info('[PrincipalAssistant] Attendance chat answered', {
      schoolId: ctx.schoolId,
      userId: ctx.userId,
      intent: intentId,
      totalTokens: routerUsage.totalTokens + result.totalTokens,
    });

    return { reply: result.content.trim() };
  },
};
