import { DateRange, parseDateRange } from './date-range';

// ── Structured conversation state (pure logic) ───────────────────────────────
// The assistant used to rely on the last few chat lines and an LLM rewrite of
// short messages. That loses the actual entities ("Aarav", class 6A, "last
// month"), so follow-ups like "in days?" or "what about last month?" had
// nothing concrete to attach to. This module keeps those entities as data and
// resolves follow-ups with plain code first; the LLM rewrite is only a fallback.
// Nothing here touches the database or the network, so it is fully unit-testable.

export type AssistantModule =
  | 'attendance' | 'fees' | 'marks' | 'students' | 'staff' | 'leave' | 'timetable'
  | 'admission' | 'transport' | 'payroll' | 'exams' | 'general';

export interface StudentRef { name: string; className?: string; section?: string }

export interface ConversationState {
  intentId: string | null;
  module: AssistantModule | null;
  topic: string | null;
  lastUserQuery: string | null;
  lastAssistantReply: string | null;
  student: StudentRef | null;
  teacher: { name: string } | null;
  className: string | null;
  section: string | null;
  dateRange: DateRange | null;
  /** Which dataset the last answer came from — a label only, never the records themselves. */
  lastDataset: { intentId: string; label: string } | null;
  pendingAction: { actionId: string } | null;
  updatedAt: string;
}

export const emptyState = (): ConversationState => ({
  intentId: null, module: null, topic: null, lastUserQuery: null, lastAssistantReply: null,
  student: null, teacher: null, className: null, section: null, dateRange: null,
  lastDataset: null, pendingAction: null, updatedAt: new Date(0).toISOString(),
});

// ── Module detection ─────────────────────────────────────────────────────────

const MODULE_PATTERNS: [AssistantModule, RegExp][] = [
  ['fees', /\bfees?\b|dues?\b|defaulters?|collection|outstanding|फीस|फ़ीस|बकाया/i],
  ['payroll', /\bsalary\b|\bpayroll\b|वेतन|तनख्वाह/i],
  ['marks', /\bmarks?\b|\bscore[ds]?\b|\bresults?\b|\bgrades?\b|\btoppers?\b|\breport card\b|अंक|नंबर|परिणाम/i],
  ['attendance', /attend|\bpresent\b|\babsent\b|\bpresence\b|हाज़िरी|हाजिरी|उपस्थिति|\bhazir/i],
  ['leave', /\bleaves?\b|\bchhutti\b|छुट्टी/i],
  ['timetable', /time\s?table|\bperiods?\b|\bsubstitut|\bfree teachers?\b|टाइमटेबल/i],
  ['admission', /admission|enquir|inquir|एडमिशन/i],
  ['transport', /\bbus(es)?\b|\btransport\b|\broute\b/i],
  ['exams', /\bexams?\b|\bunit test\b|परीक्षा/i],
];

export function detectModule(message: string): AssistantModule | null {
  for (const [mod, re] of MODULE_PATTERNS) if (re.test(message)) return mod;
  return null;
}

const MODULE_BY_INTENT_PREFIX: [RegExp, AssistantModule][] = [
  [/ATTENDANCE|ABSENT|PRESENT|LATE_STAFF/, 'attendance'],
  [/FEE/, 'fees'],
  [/PAYROLL|EXPENSE/, 'payroll'],
  [/TOP_BOTTOM|FAILED|RESULTS/, 'marks'],
  [/LEAVE/, 'leave'],
  [/TEACHER_SCHEDULE|FREE_TEACHERS|SUBSTITUTE/, 'timetable'],
  [/ENQUIR|FOLLOW|ADMISSION|DOCUMENTS/, 'admission'],
  [/TRANSPORT/, 'transport'],
  [/EXAM/, 'exams'],
];

export function moduleForIntent(intentId: string | null): AssistantModule | null {
  if (!intentId) return null;
  return MODULE_BY_INTENT_PREFIX.find(([re]) => re.test(intentId))?.[1] ?? null;
}

// ── Follow-up resolution ─────────────────────────────────────────────────────

const PRONOUN = /\b(him|his|her|hers|he|she|them|their|that student|this student|same (?:student|class|teacher)|the same|that class|that one)\b|\b(uska|uski|uske|unka|unki|wahi|usi)\b|उसका|उसकी|उनका|उनकी/i;
const IN_DAYS = /^(?:and\s+|so\s+)?(?:in\s+days?|(?:in\s+)?number\s+of\s+days|how\s+many\s+days|days\s+(?:wise|mein|me)|din\s+(?:mein|me)|दिनों\s+में|दिन\s+में)\s*\??$/i;
const DETAIL = /\b(detail(?:ed|s)?|full|complete|more|breakdown|in\s+detail)\b|\bshow\s+(?:me\s+)?(?:the\s+)?report\b|\bpoori\b|विस्तार/i;
const OPEN_IT = /^(?:please\s+)?(?:open|go\s+to|take\s+me\s+to|show)\s+(?:it|that|this|the\s+(?:page|screen))\s*\.?$/i;
const FILLER = new Set([
  'and', 'what', 'about', 'how', 'show', 'me', 'for', 'the', 'in', 'of', 'then', 'now', 'also', 'same', 'please', 'give',
  'kya', 'aur', 'ka', 'ke', 'ki', 'ko', 'mein', 'me',
]);

const NAV_BY_MODULE: Partial<Record<AssistantModule, string>> = {
  attendance: 'open attendance',
  fees: 'open fee management',
  leave: 'open leave requests',
  timetable: 'open school timetable',
  admission: 'open admission enquiries',
  students: 'open student directory',
  marks: 'open exams',
  exams: 'open exams',
};

export interface FollowUpResolution {
  /** The message to route/answer — standalone when carry-over happened, otherwise the original text. */
  message: string;
  /** Which state fields were carried into the message (for logging and tests). */
  carried: string[];
  /** The user moved to a different subject, so old entities/filters were dropped. */
  topicChanged: boolean;
  /** True when plain code produced `message`; false means the caller may still try an LLM rewrite. */
  deterministic: boolean;
}

function subjectPhrase(state: ConversationState): string | null {
  if (state.student) {
    const cls = state.student.className ? ` (class ${state.student.className}${state.student.section ?? ''})` : '';
    return `${state.student.name}${cls}`;
  }
  if (state.teacher) return state.teacher.name;
  if (state.className) return `class ${state.className}${state.section ?? ''}`;
  return null;
}

function stripPeriodWords(message: string): string[] {
  return message
    .toLowerCase()
    .replace(/last\s+\d+\s+days?|last\s+month|this\s+month|last\s+week|this\s+week|yesterday|today|previous\s+month|pichle\s+\w+|is\s+\w+/g, ' ')
    .replace(/[?.!,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !FILLER.has(w));
}

export function resolveFollowUp(rawMessage: string, state: ConversationState, today: string): FollowUpResolution {
  const message = rawMessage.trim();
  const unchanged = (topicChanged = false): FollowUpResolution => ({ message, carried: [], topicChanged, deterministic: false });
  const words = message.split(/\s+/).filter(Boolean);

  if (!state.module && !state.student && !state.className && !state.teacher) return unchanged();

  const newModule = detectModule(message);
  const hasPronoun = PRONOUN.test(message);
  const range = parseDateRange(message, today);
  const topicChanged = !!newModule && !!state.module && newModule !== state.module && !hasPronoun;
  if (topicChanged) return unchanged(true);

  const subject = subjectPhrase(state);
  const mod = newModule ?? state.module;
  const rangeLabel = (range ?? state.dateRange)?.label;

  // "open it" / "open that" → the screen for the module we were just discussing.
  if (OPEN_IT.test(message) && mod && NAV_BY_MODULE[mod]) {
    return { message: NAV_BY_MODULE[mod]!, carried: ['module'], topicChanged: false, deterministic: true };
  }

  // "in days?" → the real present/absent day counts for the same subject and period.
  if (IN_DAYS.test(message) && state.module === 'attendance' && subject) {
    const per = rangeLabel ? ` for the ${rangeLabel}` : '';
    return {
      message: `${subject} attendance in days — actual present days and absent days${per}`,
      carried: ['student/class', 'module', ...(rangeLabel ? ['dateRange'] : [])],
      topicChanged: false,
      deterministic: true,
    };
  }

  // "what about last month?" — keep the subject and module, change only the period.
  if (range && words.length <= 6 && stripPeriodWords(message).length === 0 && mod && subject) {
    const noun = mod === 'attendance' ? 'attendance' : mod === 'marks' ? 'marks' : mod === 'fees' ? 'fees' : mod;
    return {
      message: `${noun} of ${subject} for ${range.label}`,
      carried: ['student/class', 'module'],
      topicChanged: false,
      deterministic: true,
    };
  }

  // "show me the detailed report" — same subject, same period, fuller output.
  if (DETAIL.test(message) && words.length <= 8 && mod && subject && !newModule) {
    const per = rangeLabel ? ` for the ${rangeLabel}` : '';
    return {
      message: `detailed ${mod} report of ${subject}${per}, include the individual dates`,
      carried: ['student/class', 'module', ...(rangeLabel ? ['dateRange'] : [])],
      topicChanged: false,
      deterministic: true,
    };
  }

  // "what about his attendance?" — a pronoun: attach the remembered person to the new ask.
  if (hasPronoun && subject && words.length <= 12) {
    const per = range ? ` for the ${range.label}` : '';
    return {
      message: `${message.replace(PRONOUN, '').replace(/\s+/g, ' ').trim()} — regarding ${subject}${per}`,
      carried: ['student/class'],
      topicChanged: false,
      deterministic: true,
    };
  }

  return unchanged();
}

// ── State update after an answered turn ──────────────────────────────────────

export interface TurnOutcome {
  /** The resolved (standalone) message that was actually answered. */
  message: string;
  reply: string;
  intentId: string | null;
  topicChanged: boolean;
  today: string;
  params?: {
    studentName?: string | null; teacherName?: string | null; className?: string | null; section?: string | null;
  };
  /** A uniquely-matched student from the fetched data (full name beats the typed first name). */
  matchedStudent?: StudentRef | null;
  dateRange?: DateRange | null;
  pendingAction?: { actionId: string } | null;
}

export function updateState(prev: ConversationState, t: TurnOutcome): ConversationState {
  const base = t.topicChanged ? emptyState() : prev;
  const module = moduleForIntent(t.intentId) ?? detectModule(t.message) ?? base.module;
  const studentName = t.params?.studentName?.trim();
  const teacherName = t.params?.teacherName?.trim();
  // An explicitly named class or teacher in this turn replaces a remembered student.
  const student: StudentRef | null = t.matchedStudent
    ?? (studentName
      ? { name: studentName, className: t.params?.className ?? undefined, section: t.params?.section ?? undefined }
      : t.params?.className || teacherName ? null : base.student);
  // A named student replaces any remembered class/teacher focus, and vice versa.
  const className = student && studentName ? null : t.params?.className ?? base.className;
  return {
    intentId: t.intentId ?? base.intentId,
    module,
    topic: t.intentId ?? base.topic,
    lastUserQuery: t.message.slice(0, 300),
    lastAssistantReply: t.reply.slice(0, 400),
    student,
    teacher: teacherName ? { name: teacherName } : student ? null : base.teacher,
    className,
    section: className ? (t.params?.section ?? base.section) : null,
    dateRange: t.dateRange ?? parseDateRange(t.message, t.today) ?? base.dateRange,
    lastDataset: t.intentId ? { intentId: t.intentId, label: t.intentId.toLowerCase().replace(/_/g, ' ') } : base.lastDataset,
    pendingAction: t.pendingAction ?? null,
    updatedAt: new Date().toISOString(),
  };
}

/** Compact text for the LLM fallback rewrite. Contains no records — only the entity labels. */
export function describeState(s: ConversationState): string {
  const parts: string[] = [];
  if (s.module) parts.push(`module: ${s.module}`);
  if (s.student) parts.push(`student: ${s.student.name}${s.student.className ? ` class ${s.student.className}${s.student.section ?? ''}` : ''}`);
  if (s.teacher) parts.push(`teacher: ${s.teacher.name}`);
  if (s.className) parts.push(`class: ${s.className}${s.section ?? ''}`);
  if (s.dateRange) parts.push(`period: ${s.dateRange.label} (${s.dateRange.from} to ${s.dateRange.to})`);
  if (s.lastUserQuery) parts.push(`previous question: ${s.lastUserQuery}`);
  return parts.join('; ');
}

/** State older than this is treated as a fresh conversation. */
export const STATE_TTL_MS = 2 * 60 * 60 * 1000;

export function isFresh(s: ConversationState, now = Date.now()): boolean {
  return now - new Date(s.updatedAt).getTime() < STATE_TTL_MS;
}
