import { openaiProvider } from '../ai/providers/llm/openai.provider';
import { chatSchema } from './principal-assistant.validation';
import { classifyIntent, recordUsage, UNSUPPORTED_INTENT, IntentDefinition } from './intent-router';
import { attendanceIntents } from './principal-assistant.intents';
import { feeIntents } from './fees.intents';
import { admissionsIntents } from './admissions.intents';
import { buildFormattingSystemPrompt } from './principal-assistant.prompts';
import { AuthContext } from '../../lib/auth-context';
import { AppError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';

const UNSUPPORTED_REPLY =
  "I'm currently able to help with attendance, fees, and admissions questions only — things like today's " +
  'attendance summary, present/absent counts, fee collection totals, outstanding dues, admission enquiries, ' +
  "pending follow-ups, or the highest/lowest performing class on attendance/fees. Could you rephrase your " +
  'question around attendance, fees, or admissions?';

// Combining all domains into one flat list keeps this a single LLM classification
// call (cheaper/faster than routing per-domain) — intent ids are unique across
// domains, so finding the matching intent's fetchData afterward is unambiguous.
const allIntents: IntentDefinition<AuthContext, unknown>[] = [...attendanceIntents, ...feeIntents, ...admissionsIntents];

export const principalAssistantService = {
  async chat(rawInput: unknown, ctx: AuthContext): Promise<{ reply: string }> {
    const { message } = chatSchema.parse(rawInput);

    if (!openaiProvider.isAvailable()) {
      throw new AppError('AI Assistant is not configured. Please contact your administrator.', 503, 'AI_UNAVAILABLE');
    }

    // Step 1 — route the question to an attendance/fees intent (or UNSUPPORTED).
    const { intentId, usage: routerUsage } = await classifyIntent(message, 'Attendance, Fees and Admissions', allIntents);
    recordUsage(routerUsage, ctx.schoolId);

    if (intentId === UNSUPPORTED_INTENT) {
      logger.info('[PrincipalAssistant] Unsupported intent', { schoolId: ctx.schoolId, message });
      return { reply: UNSUPPORTED_REPLY };
    }

    const intent = allIntents.find((i) => i.id === intentId);
    if (!intent) {
      // Defensive: classifyIntent only returns ids from allIntents or UNSUPPORTED.
      return { reply: UNSUPPORTED_REPLY };
    }

    // Step 2 — fetch only the data this intent needs (backend does all the math).
    const data = await intent.fetchData(ctx);

    // Step 3 — OpenAI formats the pre-computed data into a natural-language answer.
    const userPrompt = `Data (JSON):\n${JSON.stringify(data, null, 2)}\n\nPrincipal's question: ${message}`;

    const result = await openaiProvider.complete({
      systemPrompt: buildFormattingSystemPrompt(),
      userPrompt,
      temperature: 0.4,
      maxTokens: 300,
    });
    recordUsage(result, ctx.schoolId);

    logger.info('[PrincipalAssistant] Chat answered', {
      schoolId: ctx.schoolId,
      userId: ctx.userId,
      intent: intentId,
      totalTokens: routerUsage.totalTokens + result.totalTokens,
    });

    return { reply: result.content.trim() };
  },
};
