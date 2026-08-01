import { openaiProvider } from '../ai/providers/llm/openai.provider';
import { chatSchema } from './principal-assistant.validation';
import { classifyIntent, recordUsage, UNSUPPORTED_INTENT, IntentDefinition } from './intent-router';
import { attendanceIntents } from './principal-assistant.intents';
import { principalAssistantData } from './principal-assistant.data';
import { feeIntents } from './fees.intents';
import { admissionsIntents } from './admissions.intents';
import { buildFormattingSystemPrompt } from './principal-assistant.prompts';
import { principalAssistantActionService, ActionPreviewResult } from './principal-assistant.action.service';
import { AuthContext } from '../../lib/auth-context';
import { AppError, ForbiddenError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';
import type { ClassAttendanceList } from './principal-assistant.data';

const UNSUPPORTED_REPLY =
  "I'm currently able to help with attendance, fees, and admissions questions only — things like today's " +
  'attendance summary, present/absent counts, fee collection totals, outstanding dues, admission enquiries, ' +
  "pending follow-ups, or the highest/lowest performing class on attendance/fees. Could you rephrase your " +
  'question around attendance, fees, or admissions?';

const ATTENDANCE_SCOPE_QUESTION = "Would you like to see today's attendance for students, teachers, or both?";
const ATTENDANCE_SCOPE_REPLIES: Record<string, 'students' | 'teachers' | 'both'> = {
  students: 'students', student: 'students', class: 'students', classes: 'students', 'class-wise': 'students',
  teachers: 'teachers', teacher: 'teachers',
  both: 'both',
};

/** Plain, deterministic formatting — no LLM pass — so the reply is always
 *  exactly as terse as the Principal asked for (a class-wise list, or a
 *  single "P/T present" line for teachers, never a paragraph). */
function formatClassList(data: ClassAttendanceList): string {
  if (!data.classes.length) return 'No attendance has been marked for any class yet today.';
  return data.classes.map((c) => `Class ${c.class}-${c.section}: ${c.present} present, ${c.absent} absent`).join('\n');
}

async function buildAttendanceScopeReply(scope: 'students' | 'teachers' | 'both', ctx: AuthContext): Promise<string> {
  if (scope === 'students') {
    return formatClassList(await principalAssistantData.getClassAttendanceList(ctx));
  }
  if (scope === 'teachers') {
    const teachers = await principalAssistantData.getTeacherCounts(ctx);
    return `${teachers.teachersPresent}/${teachers.teachersTotal} teachers present today.`;
  }
  const [classes, teachers] = await Promise.all([
    principalAssistantData.getClassAttendanceList(ctx),
    principalAssistantData.getTeacherCounts(ctx),
  ]);
  return `${formatClassList(classes)}\n\nTeachers: ${teachers.teachersPresent}/${teachers.teachersTotal} present.`;
}

// Combining all domains into one flat list keeps this a single LLM classification
// call (cheaper/faster than routing per-domain) — intent ids are unique across
// domains, so finding the matching intent's fetchData afterward is unambiguous.
const allIntents: IntentDefinition<AuthContext, unknown>[] = [...attendanceIntents, ...feeIntents, ...admissionsIntents];

export type ChatResult =
  | { type: 'text'; reply: string; quickReplies?: string[] }
  | { type: 'action_preview'; actionId: string; params: Record<string, unknown>; preview: ActionPreviewResult['preview'] };

export const principalAssistantService = {
  async chat(rawInput: unknown, ctx: AuthContext): Promise<ChatResult> {
    const { message } = chatSchema.parse(rawInput);

    if (!openaiProvider.isAvailable()) {
      throw new AppError('AI Assistant is not configured. Please contact your administrator.', 503, 'AI_UNAVAILABLE');
    }

    // Step -1 — a one-word reply to our own "students, teachers, or both?"
    // follow-up (typed or tapped as a quick-reply chip) is answered directly,
    // deterministically, and without another LLM round trip.
    const scope = ATTENDANCE_SCOPE_REPLIES[message.trim().toLowerCase()];
    if (scope) {
      return { type: 'text', reply: await buildAttendanceScopeReply(scope, ctx) };
    }

    // Step 0 — check whether this is an action request (e.g. "schedule a staff
    // meeting") before falling into the read-only Q&A flow below. Kept as a
    // separate classification call for now since there's only one action
    // registered; once more actions exist this should merge into a single
    // combined classification call the way allIntents already merges domains.
    try {
      const actionResult = await principalAssistantActionService.previewFromMessage(message, ctx);
      if (actionResult) {
        return {
          type: 'action_preview',
          actionId: actionResult.actionId,
          params: actionResult.params,
          preview: actionResult.preview,
        };
      }
    } catch (err) {
      if (err instanceof ForbiddenError) throw err;
      // AI_UNAVAILABLE or other action-path errors shouldn't block the Q&A
      // fallback below — log and continue.
      logger.warn('[PrincipalAssistant] Action classification failed, falling back to Q&A', {
        schoolId: ctx.schoolId,
        err: (err as Error).message,
      });
    }

    // Step 1 — route the question to an attendance/fees intent (or UNSUPPORTED).
    const { intentId, usage: routerUsage } = await classifyIntent(message, 'Attendance, Fees and Admissions', allIntents);
    recordUsage(routerUsage, ctx.schoolId);

    if (intentId === UNSUPPORTED_INTENT) {
      logger.info('[PrincipalAssistant] Unsupported intent', { schoolId: ctx.schoolId, message });
      return { type: 'text', reply: UNSUPPORTED_REPLY };
    }

    const intent = allIntents.find((i) => i.id === intentId);
    if (!intent) {
      // Defensive: classifyIntent only returns ids from allIntents or UNSUPPORTED.
      return { type: 'text', reply: UNSUPPORTED_REPLY };
    }

    // A generic "today's attendance" ask is answered with a short scope
    // question instead of one long narrative covering students, teachers,
    // and class extremes all at once — the Principal picks what they
    // actually want (handled by the fast path above on their next message).
    if (intentId === 'ATTENDANCE_SUMMARY') {
      return { type: 'text', reply: ATTENDANCE_SCOPE_QUESTION, quickReplies: ['Students', 'Teachers', 'Both'] };
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

    return { type: 'text', reply: result.content.trim() };
  },
};
