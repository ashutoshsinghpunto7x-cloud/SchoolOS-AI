import { openaiProvider } from '../ai/providers/llm/openai.provider';
import { LLMCompletionOutput } from '../ai/providers/llm/llm-provider.interface';

// ── Single-call message router ────────────────────────────────────────────────
// Previously every chat message cost up to three sequential OpenAI calls
// (action classifier → intent classifier → formatter). This collapses the first
// two into ONE call that chooses between: open a screen, perform an action
// (with preview/approve), answer a data question, or "unsupported". It also
// understands Hindi / Hinglish, which is what voice input produces.

export type RouteKind = 'navigate' | 'action' | 'intent' | 'unsupported';

export interface RouteDecision {
  kind: RouteKind;
  id: string | null;
}

interface Option {
  id: string;
  description: string;
}

export interface RouteOptions {
  navigation: Option[];
  actions: Option[];
  intents: Option[];
}

function list(options: Option[]): string {
  return options.map((o) => `- ${o.id}: ${o.description}`).join('\n');
}

function buildPrompt(opts: RouteOptions): string {
  return `
You route messages for the AI Copilot of a school ERP, used by the school Principal. The message may
be typed or spoken, in English, Hindi, or Hinglish (Hindi written in English letters). Choose exactly
ONE route:

1. "navigate" — the Principal wants to OPEN / GO TO / SHOW a screen. Use for "open attendance",
   "take me to leave requests", "fees page dikhao", "show timetable". Also use it when they ask about
   something that has a matching screen but no data answer below (e.g. "show pending test approvals").
${list(opts.navigation)}

2. "action" — the Principal wants the assistant to DO something (create/change data):
${list(opts.actions)}

3. "intent" — the Principal asks a QUESTION that can be answered with live numbers:
${list(opts.intents)}

4. "unsupported" — greetings, chit-chat, or anything not covered above.

Respond ONLY with JSON: {"kind": "navigate" | "action" | "intent" | "unsupported", "id": "<ID from the lists above, or null>"}.
Never invent an id. If a question asks for a number (how many, kitne, total) prefer "intent" over "navigate".
`.trim();
}

export interface RoutingResult {
  decision: RouteDecision;
  usage: LLMCompletionOutput;
}

export async function routeMessage(message: string, opts: RouteOptions): Promise<RoutingResult> {
  const result = await openaiProvider.complete({
    systemPrompt: buildPrompt(opts),
    userPrompt: message,
    temperature: 0,
    maxTokens: 50,
    jsonResponse: true,
  });

  const valid: Record<Exclude<RouteKind, 'unsupported'>, Set<string>> = {
    navigate: new Set(opts.navigation.map((o) => o.id)),
    action: new Set(opts.actions.map((o) => o.id)),
    intent: new Set(opts.intents.map((o) => o.id)),
  };

  let decision: RouteDecision = { kind: 'unsupported', id: null };
  try {
    const parsed = JSON.parse(result.content) as { kind?: string; id?: string | null };
    const kind = parsed.kind as RouteKind | undefined;
    if (kind && kind !== 'unsupported' && kind in valid && parsed.id && valid[kind].has(parsed.id)) {
      decision = { kind, id: parsed.id };
    }
  } catch {
    // Malformed JSON — treat as unsupported rather than guessing.
  }

  return { decision, usage: result };
}
