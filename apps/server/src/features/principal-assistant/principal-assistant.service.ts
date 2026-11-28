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
import { buildMorningBriefing, BRIEFING_PATTERN } from './briefing.data';
import { buildAlertsReply, ALERTS_PATTERN } from './alerts.data';
import { buildFormattingSystemPrompt } from './principal-assistant.prompts';
import { principalAssistantActionService, ActionPreviewResult } from './principal-assistant.action.service';
import { conversationStateStore } from './conversation-state.store';
import {
  ConversationState, describeState, resolveFollowUp, updateState, TurnOutcome,
} from './conversation-state';
import { assertIntentAllowed, isIntentAllowed, SENSITIVE_INTENTS } from './intent-access';
import { parseAttendanceClaim, checkAttendanceConsistency } from './attendance-math';
import { extractQueryParams } from './query-params';
import { auditService } from '../audit/audit.service';
import { attendanceRepository } from '../attendance/attendance.repository';
import { AuthContext } from '../../lib/auth-context';
import { AppError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';
import type { ClassAttendanceList } from './principal-assistant.data';

const FOLLOW_UP_MAX_WORDS = 8;

/** Rewrites a short follow-up into a standalone question; returns the message unchanged when it already stands alone. */
async function rewriteFollowUpWithLlm(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  state: ConversationState,
  ctx: AuthContext,
): Promise<string> {
  const stateText = describeState(state);
  if ((!history.length && !stateText) || message.split(/\s+/).length > FOLLOW_UP_MAX_WORDS) return message;
  try {
    const result = await openaiProvider.complete({
      systemPrompt:
        "You rewrite the last message of a school Principal's chat into ONE complete standalone question or command, using the earlier turns for context " +
        '(class, subject, student, date, topic). If the last message is already complete on its own, return it unchanged. Keep the original language ' +
        '(English, Hindi or Hinglish). Never answer it. Respond ONLY with JSON: {"message": "<rewritten message>"}.',
      userPrompt:
        `Conversation state (entities in focus): ${stateText || 'none'}\n` +
        `Earlier turns:\n${history.map((h) => `${h.role}: ${h.content}`).join('\n')}\n\nLast message: ${message}`,
      temperature: 0,
      maxTokens: 120,
      jsonResponse: true,
    });
    recordUsage(result, ctx.schoolId);
    const rewritten = (JSON.parse(result.content) as { message?: string }).message?.trim();
    return rewritten && rewritten.length <= 1000 ? rewritten : message;
  } catch {
    return message;
  }
}

const UNSUPPORTED_REPLY =
  "I couldn't match that to anything I can look up or do. Name the class, student or screen and I'll take it from there — " +
  'for example "attendance for class 6A last month" or "open leave requests".';

const HAS_DEVANAGARI = /[ऀ-ॿ]/;

const UNSUPPORTED_REPLY_HI =
  'मैं इसे समझ नहीं पाया। कक्षा, छात्र या स्क्रीन का नाम बताइए — जैसे "कक्षा 6A की पिछले महीने की उपस्थिति" या "छुट्टी के अनुरोध खोलो"।';

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

interface StudentMatch { name: string; class: string; section: string }

export type ChatResult =
  | { type: 'text'; reply: string; quickReplies?: string[] }
  | { type: 'navigate'; reply: string; path: string; label: string }
  | { type: 'substitution_plan'; reply: string; date: string }
  | { type: 'action_preview'; actionId: string; params: Record<string, unknown>; preview: ActionPreviewResult['preview'] };

/** Never-blank guarantee: whatever the model or a tool produced, the user always gets a sentence. */
const FALLBACK_REPLY = "I couldn't put an answer together for that just now. Please try again, or rephrase the question.";
const ensureReply = (text: string | undefined | null): string => (text && text.trim() ? text.trim() : FALLBACK_REPLY);

const SOURCE_DOWN_REPLY =
  "I couldn't reach that data just now, so I won't guess at the numbers. Please try again in a moment.";

/** Plain, faithful rendering of fetched data for when the formatting model is unavailable. Adds nothing. */
function plainFallback(data: unknown): string {
  const lines: string[] = [];
  const walk = (v: unknown, label: string, depth: number) => {
    if (lines.length >= 40 || v == null) return;
    if (Array.isArray(v)) {
      v.slice(0, 15).forEach((item, i) => walk(item, `${label} ${i + 1}`, depth + 1));
    } else if (typeof v === 'object') {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) walk(val, depth === 0 ? k : `${label} ${k}`, depth + 1);
    } else {
      lines.push(`${label}: ${String(v)}`);
    }
  };
  walk(data, '', 0);
  return lines.length ? `Here is what the records show:\n${lines.join('\n')}` : FALLBACK_REPLY;
}

/** Saves the structured-state update that goes with an answered turn. */
async function remember(
  ctx: AuthContext,
  prev: ConversationState,
  outcome: Omit<TurnOutcome, 'today'>,
): Promise<void> {
  const next = updateState(prev, { ...outcome, today: attendanceRepository.todayString() });
  await conversationStateStore.save(ctx.schoolId, ctx.userId, next);
}

export const principalAssistantService = {
  /** Forget the remembered student / class / period (the "new chat" button). */
  async resetConversation(ctx: AuthContext): Promise<void> {
    await conversationStateStore.clear(ctx.schoolId, ctx.userId);
  },

  async chat(rawInput: unknown, ctx: AuthContext): Promise<ChatResult> {
    const parsed = chatSchema.parse(rawInput);
    let message = parsed.message;
    const history = parsed.history ?? [];

    // Substitution questions are matched by keyword and answered from the
    // timetable alone, so they work even when the AI service is down.
    // "Assign X to cover 6A period 3" is an ACTION, so it skips this keyword shortcut.
    const isAssignment = /\b(assign|appoint|lagao|laga\s?do|cover)\b|लगाओ|नियुक्त/i.test(message);
    const substitution = isAssignment ? null : parseSubstitutionRequest(message);
    if (substitution) {
      assertIntentAllowed('TEACHER_SCHEDULE', ctx.role);
      const needed = await timetableService.getNeedsSubstitute(ctx.schoolId, substitution.date);
      return {
        type: 'substitution_plan',
        date: substitution.date,
        reply: substitutionReply(needed, substitution.dayLabel, HAS_DEVANAGARI.test(message)),
      };
    }

    // Morning briefing is keyword-matched and built from live data alone, so it
    // also works when the AI service is down and costs no tokens.
    if (ALERTS_PATTERN.test(message)) {
      assertIntentAllowed('ATTENTION_ALERTS', ctx.role);
      return { type: 'text', reply: ensureReply(await buildAlertsReply(ctx)) };
    }
    if (BRIEFING_PATTERN.test(message)) {
      assertIntentAllowed('DAILY_BRIEFING', ctx.role);
      return { type: 'text', reply: ensureReply(await buildMorningBriefing(ctx)) };
    }

    // A typed statement whose own numbers disagree ("88% in 30 days, absent 3
    // days") is flagged, not answered with a made-up count. Pure arithmetic.
    const claimIssues = checkAttendanceConsistency(parseAttendanceClaim(message));
    if (claimIssues.length) {
      return {
        type: 'text',
        reply:
          `Those figures don't agree: ${claimIssues.map((i) => i.message).join(' ')} ` +
          "I haven't changed anything — please check the attendance entries, or ask me for the day-by-day record.",
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
      assertIntentAllowed('ATTENDANCE_SUMMARY', ctx.role);
      try {
        return { type: 'text', reply: ensureReply(await buildAttendanceScopeReply(scope, ctx)) };
      } catch (err) {
        logger.error('[PrincipalAssistant] Attendance scope lookup failed', { schoolId: ctx.schoolId, err: (err as Error).message });
        return { type: 'text', reply: SOURCE_DOWN_REPLY };
      }
    }

    // Context: structured state (server-side, keyed by the signed-in user) first,
    // plain-code resolution of "in days?", "last month", "his marks", "open it";
    // the LLM rewrite is only a fallback for follow-ups code could not resolve.
    const state = await conversationStateStore.load(ctx.schoolId, ctx.userId);
    const today = attendanceRepository.todayString();
    const resolution = resolveFollowUp(message, state, today);
    message = resolution.message;
    if (!resolution.deterministic && !resolution.topicChanged) {
      message = await rewriteFollowUpWithLlm(message, history, state, ctx);
    }
    // A topic switch drops the old entities, so the new question can't inherit a stale student or class.
    const stateForTurn: ConversationState = resolution.topicChanged
      ? { ...state, student: null, teacher: null, className: null, section: null, dateRange: null }
      : state;

    // Step 0 — ONE routing call decides: open a screen, perform an action
    // (preview/approve), answer a data question, or unsupported.
    let routing;
    try {
      routing = await routeMessage(message, {
        navigation: NAVIGATION_TARGETS.map((t) => ({ id: t.id, description: `${t.label} — ${t.description}` })),
        actions: principalAssistantActionService.listActions(),
        // Only intents this role may use are even offered to the router.
        intents: allIntents.filter((i) => isIntentAllowed(i.id, ctx.role)).map((i) => ({ id: i.id, description: i.description })),
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

    const baseOutcome = { message, topicChanged: resolution.topicChanged };

    if (kind === 'navigate' && routedId) {
      const target = findNavigationTarget(routedId);
      if (target) {
        const reply = HAS_DEVANAGARI.test(message) ? `${target.label} खोल रहा हूँ…` : `Opening ${target.label}…`;
        await remember(ctx, stateForTurn, { ...baseOutcome, reply, intentId: null });
        return { type: 'navigate', reply, path: target.path, label: target.label };
      }
    }

    if (kind === 'action' && routedId) {
      const actionResult = await principalAssistantActionService.previewForAction(routedId, message, ctx);
      await remember(ctx, stateForTurn, {
        ...baseOutcome, reply: actionResult.preview.title, intentId: null, pendingAction: { actionId: actionResult.actionId },
      });
      return {
        type: 'action_preview',
        actionId: actionResult.actionId,
        params: actionResult.params,
        preview: actionResult.preview,
      };
    }

    const intentId = kind === 'intent' && routedId ? routedId : UNSUPPORTED_INTENT;
    const routerUsage = routing.usage;
    const unsupported = HAS_DEVANAGARI.test(message) ? UNSUPPORTED_REPLY_HI : UNSUPPORTED_REPLY;

    if (intentId === UNSUPPORTED_INTENT) {
      logger.info('[PrincipalAssistant] Unsupported intent', { schoolId: ctx.schoolId });
      return { type: 'text', reply: unsupported };
    }

    const intent = allIntents.find((i) => i.id === intentId);
    if (!intent) return { type: 'text', reply: unsupported };

    // Backend permission gate — independent of the route guard and of the prompt.
    if (!isIntentAllowed(intentId, ctx.role)) {
      auditService.log({
        userId: ctx.userId, userDisplayName: ctx.displayName, action: 'ai_assistant.denied',
        resource: 'principal-assistant', resourceId: intentId, details: { role: ctx.role }, ip: ctx.ip, schoolId: ctx.schoolId,
      });
      return { type: 'text', reply: "You don't have access to that information." };
    }
    if (SENSITIVE_INTENTS.has(intentId)) {
      auditService.log({
        userId: ctx.userId, userDisplayName: ctx.displayName, action: 'ai_assistant.queried',
        resource: 'principal-assistant', resourceId: intentId, details: { question: message.slice(0, 200) }, ip: ctx.ip, schoolId: ctx.schoolId,
      });
    }

    try {
      if (intentId === 'ATTENTION_ALERTS') {
        const reply = ensureReply(await buildAlertsReply(ctx));
        await remember(ctx, stateForTurn, { ...baseOutcome, reply, intentId });
        return { type: 'text', reply };
      }
      if (intentId === 'DAILY_BRIEFING') {
        const reply = ensureReply(await buildMorningBriefing(ctx));
        await remember(ctx, stateForTurn, { ...baseOutcome, reply, intentId });
        return { type: 'text', reply };
      }

      // A generic "today's attendance" ask is answered with a short scope
      // question instead of one long narrative covering students, teachers,
      // and class extremes all at once.
      if (intentId === 'ATTENDANCE_SUMMARY') {
        await remember(ctx, stateForTurn, { ...baseOutcome, reply: ATTENDANCE_SCOPE_QUESTION, intentId });
        return { type: 'text', reply: ATTENDANCE_SCOPE_QUESTION, quickReplies: ['Students', 'Teachers', 'Both'] };
      }

      // Step 2 — fetch only the data this intent needs (backend does all the math).
      let data: unknown;
      try {
        data = await intent.fetchData(ctx, message);
      } catch (err) {
        logger.error('[PrincipalAssistant] Data fetch failed', { schoolId: ctx.schoolId, intent: intentId, err: (err as Error).message });
        return { type: 'text', reply: SOURCE_DOWN_REPLY };
      }

      // A fetcher that needs the Principal to pick (e.g. two students with one name)
      // returns the question + options; show them as tap-to-answer chips, no AI pass.
      const clarify = (data as { clarify?: { question: string; options: string[] } } | null)?.clarify;
      if (clarify?.options?.length) {
        return { type: 'text', reply: clarify.question, quickReplies: clarify.options };
      }

      // Step 3 — OpenAI formats the pre-computed data into a natural-language answer.
      const userPrompt = `Data (JSON):\n${JSON.stringify(data, null, 2)}\n\nPrincipal's question: ${message}`;
      let reply: string;
      let totalTokens = routerUsage.totalTokens;
      try {
        const result = await openaiProvider.complete({
          systemPrompt: buildFormattingSystemPrompt(),
          userPrompt,
          temperature: 0.4,
          maxTokens: 600,
        });
        recordUsage(result, ctx.schoolId);
        totalTokens += result.totalTokens;
        reply = ensureReply(result.content);
        if (reply === FALLBACK_REPLY) reply = plainFallback(data);
      } catch (err) {
        logger.error('[PrincipalAssistant] Formatting failed — returning plain data', { schoolId: ctx.schoolId, err: (err as Error).message });
        reply = plainFallback(data);
      }

      logger.info('[PrincipalAssistant] Chat answered', {
        schoolId: ctx.schoolId, userId: ctx.userId, intent: intentId, totalTokens,
        carried: resolution.carried, topicChanged: resolution.topicChanged,
      });

      // Remember who/what this answer was about so the next short message can build on it.
      type Period = { label: string; from: string; to: string };
      const params = await extractQueryParams(message, ctx).catch(() => null);
      const matches = (data as { matches?: (StudentMatch & { attendance?: { period?: Period } })[] } | null)?.matches;
      const rangeFromData = (data as { period?: Period } | null)?.period ?? matches?.[0]?.attendance?.period;
      await remember(ctx, stateForTurn, {
        ...baseOutcome,
        reply,
        intentId,
        params: params ?? undefined,
        matchedStudent: matches?.length === 1 ? { name: matches[0].name, className: matches[0].class, section: matches[0].section } : null,
        dateRange: rangeFromData ?? null,
      });

      return { type: 'text', reply };
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error('[PrincipalAssistant] Unexpected failure', { schoolId: ctx.schoolId, intent: intentId, err: (err as Error).message });
      return { type: 'text', reply: SOURCE_DOWN_REPLY };
    }
  },
};
