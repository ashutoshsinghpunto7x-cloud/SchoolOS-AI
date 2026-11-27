import { openaiProvider } from '../ai/providers/llm/openai.provider';
import { chatSchema } from './principal-assistant.validation';
import { recordUsage, UNSUPPORTED_INTENT, IntentDefinition } from './intent-router';
import { routeMessage } from './unified-router';
import { NAVIGATION_TARGETS, findNavigationTarget } from './navigation.targets';
import { attendanceIntents } from './principal-assistant.intents';
import { principalAssistantData } from './principal-assistant.data';
import { parseSubstitutionRequest } from './substitution.intent';
import { timetableService } from '../timetable/timetable.service';
import { feeIntents } from './fees.intents';
import { admissionsIntents } from './admissions.intents';
import { peopleIntents } from './people.intents';
import { buildFormattingSystemPrompt } from './principal-assistant.prompts';
import { principalAssistantActionService, ActionPreviewResult } from './principal-assistant.action.service';
import { AuthContext } from '../../lib/auth-context';
import { AppError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';
import type { ClassAttendanceList } from './principal-assistant.data';

const UNSUPPORTED_REPLY =
  "I can open any screen (try \"open leave requests\"), suggest substitutes, schedule staff meetings, move timetable periods, and answer " +
  "questions about attendance, fees and admissions — e.g. \"which teachers are absent today?\", " +
  "\"how many marks did Arav score in Hindi?\" or \"outstanding fees\". You can also speak to me with the mic button. What would you like to do?";

const HAS_DEVANAGARI = /[ऀ-ॿ]/;

const UNSUPPORTED_REPLY_HI =
  'मैं कोई भी स्क्रीन खोल सकता हूँ (जैसे "छुट्टी के अनुरोध खोलो"), स्टाफ मीटिंग शेड्यूल कर सकता हूँ, टाइमटेबल बदल सकता हूँ, ' +
  'और उपस्थिति, फीस व एडमिशन के सवालों के जवाब दे सकता हूँ। बताइए, क्या करना है?';

const ATTENDANCE_SCOPE_QUESTION = "Would you like to see today's attendance for students, teachers, or both?";
const ATTENDANCE_SCOPE_REPLIES: Record<string, 'students' | 'teachers' | 'both'> = {
  students: 'students', student: 'students', class: 'students', classes: 'students', 'class-wise': 'students',
  teachers: 'teachers', teacher: 'teachers',
  both: 'both',
  'छात्र': 'students', 'विद्यार्थी': 'students', 'बच्चे': 'students', 'कक्षा': 'students',
  'शिक्षक': 'teachers', 'टीचर': 'teachers', 'अध्यापक': 'teachers',
  'दोनों': 'both', 'दोनो': 'both',
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

function substitutionReply(
  needed: { originalTeacherId: string }[], day: 'today' | 'tomorrow', hindi: boolean,
): string {
  const dayHi = day === 'today' ? 'आज' : 'कल';
  if (!needed.length) {
    return hindi
      ? `${dayHi} किसी पीरियड के लिए सब्स्टीट्यूट की ज़रूरत बाकी नहीं है।`
      : `No periods are waiting for a substitute ${day}.`;
  }
  const periods = needed.length;
  const teachers = new Set(needed.map((n) => n.originalTeacherId)).size;
  return hindi
    ? `${dayHi} ${teachers} शिक्षक अनुपस्थित हैं और ${periods} पीरियड के लिए सब्स्टीट्यूट चाहिए। सुझाव नीचे हैं।`
    : `${periods} ${periods === 1 ? 'period needs' : 'periods need'} a substitute ${day} ` +
      `(${teachers} ${teachers === 1 ? 'teacher' : 'teachers'} away). Suggestions are below.`;
}

// Combining all domains into one flat list keeps this a single LLM classification
// call (cheaper/faster than routing per-domain) — intent ids are unique across
// domains, so finding the matching intent's fetchData afterward is unambiguous.
const allIntents: IntentDefinition<AuthContext, unknown>[] = [...attendanceIntents, ...feeIntents, ...admissionsIntents, ...peopleIntents];

export type ChatResult =
  | { type: 'text'; reply: string; quickReplies?: string[] }
  | { type: 'navigate'; reply: string; path: string; label: string }
  | { type: 'substitution_plan'; reply: string; date: string }
  | { type: 'action_preview'; actionId: string; params: Record<string, unknown>; preview: ActionPreviewResult['preview'] };

export const principalAssistantService = {
  async chat(rawInput: unknown, ctx: AuthContext): Promise<ChatResult> {
    const { message } = chatSchema.parse(rawInput);

    // Substitution questions are matched by keyword and answered from the
    // timetable alone, so they work even when the AI service is down.
    const substitution = parseSubstitutionRequest(message);
    if (substitution) {
      const needed = await timetableService.getNeedsSubstitute(ctx.schoolId, substitution.date);
      return {
        type: 'substitution_plan',
        date: substitution.date,
        reply: substitutionReply(needed, substitution.dayLabel, HAS_DEVANAGARI.test(message)),
      };
    }

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

    // Step 0 — ONE routing call decides: open a screen, perform an action
    // (preview/approve), answer a data question, or unsupported. (Previously two
    // sequential classification calls, which made every reply slow.)
    let routing;
    try {
      routing = await routeMessage(message, {
        navigation: NAVIGATION_TARGETS.map((t) => ({ id: t.id, description: `${t.label} — ${t.description}` })),
        actions: principalAssistantActionService.listActions(),
        intents: allIntents.map((i) => ({ id: i.id, description: i.description })),
      });
    } catch (err) {
      logger.error('[PrincipalAssistant] Routing call failed', { schoolId: ctx.schoolId, err: (err as Error).message });
      throw new AppError(
        'The AI service is busy or unreachable right now. Please try again in a moment.',
        503,
        'AI_UNAVAILABLE',
      );
    }
    recordUsage(routing.usage, ctx.schoolId);
    const { kind, id: routedId } = routing.decision;

    if (kind === 'navigate' && routedId) {
      const target = findNavigationTarget(routedId);
      if (target) {
        const reply = HAS_DEVANAGARI.test(message) ? `${target.label} खोल रहा हूँ…` : `Opening ${target.label}…`;
        return { type: 'navigate', reply, path: target.path, label: target.label };
      }
    }

    if (kind === 'action' && routedId) {
      const actionResult = await principalAssistantActionService.previewForAction(routedId, message, ctx);
      return {
        type: 'action_preview',
        actionId: actionResult.actionId,
        params: actionResult.params,
        preview: actionResult.preview,
      };
    }

    const intentId = kind === 'intent' && routedId ? routedId : UNSUPPORTED_INTENT;
    const routerUsage = routing.usage;

    if (intentId === UNSUPPORTED_INTENT) {
      logger.info('[PrincipalAssistant] Unsupported intent', { schoolId: ctx.schoolId, message });
      return { type: 'text', reply: HAS_DEVANAGARI.test(message) ? UNSUPPORTED_REPLY_HI : UNSUPPORTED_REPLY };
    }

    const intent = allIntents.find((i) => i.id === intentId);
    if (!intent) {
      return { type: 'text', reply: HAS_DEVANAGARI.test(message) ? UNSUPPORTED_REPLY_HI : UNSUPPORTED_REPLY };
    }

    // A generic "today's attendance" ask is answered with a short scope
    // question instead of one long narrative covering students, teachers,
    // and class extremes all at once — the Principal picks what they
    // actually want (handled by the fast path above on their next message).
    if (intentId === 'ATTENDANCE_SUMMARY') {
      return { type: 'text', reply: ATTENDANCE_SCOPE_QUESTION, quickReplies: ['Students', 'Teachers', 'Both'] };
    }

    // Step 2 — fetch only the data this intent needs (backend does all the math).
    const data = await intent.fetchData(ctx, message);

    // Step 3 — OpenAI formats the pre-computed data into a natural-language answer.
    const userPrompt = `Data (JSON):\n${JSON.stringify(data, null, 2)}\n\nPrincipal's question: ${message}`;

    const result = await openaiProvider.complete({
      systemPrompt: buildFormattingSystemPrompt(),
      userPrompt,
      temperature: 0.4,
      maxTokens: 600,
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
