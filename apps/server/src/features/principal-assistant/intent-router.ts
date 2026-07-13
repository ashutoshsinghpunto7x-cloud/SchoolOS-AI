import { openaiProvider, estimateCost } from '../ai/providers/llm/openai.provider';
import { LLMCompletionOutput } from '../ai/providers/llm/llm-provider.interface';
import { aiUsageRepository } from '../ai/ai.repository';

// ── Generic intent-routing layer ─────────────────────────────────────────────
// Domain-agnostic: any feature (attendance today, fees/students/HR later) can
// register a list of { id, description, fetchData } intents and get natural-
// language intent classification without writing keyword/regex matching.
// The LLM only ever picks an id from the given list — it never invents one.

export const UNSUPPORTED_INTENT = 'UNSUPPORTED';

export interface IntentDefinition<TCtx, TData> {
  id: string;
  /** Shown to the router LLM verbatim — describe what kind of question this covers. */
  description: string;
  fetchData: (ctx: TCtx) => Promise<TData>;
}

export interface IntentClassification {
  intentId: string;
  usage: LLMCompletionOutput;
}

function buildRouterSystemPrompt(domainName: string, intents: IntentDefinition<unknown, unknown>[]): string {
  const intentList = intents.map((i) => `- ${i.id}: ${i.description}`).join('\n');
  return `
You are an intent classifier for the ${domainName} domain of a school ERP assistant.
Given the Principal's question, choose exactly ONE of the following intents:

${intentList}
- ${UNSUPPORTED_INTENT}: the question does not match any intent above (including questions about
  other topics entirely, e.g. fees, students, exams).

Respond ONLY with a JSON object of the form {"intent": "<INTENT_ID>"}. Do not explain your choice,
do not invent an intent id that isn't in the list above.
`.trim();
}

/** Records OpenAI usage/cost for a router or formatting call, fire-and-forget. */
export function recordUsage(usage: LLMCompletionOutput, schoolId: string): void {
  aiUsageRepository.record({
    provider: 'openai',
    aiModel: usage.model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    estimatedCostUsd: estimateCost(usage.model, usage.promptTokens, usage.completionTokens),
    durationMs: usage.durationMs,
    schoolId,
  });
}

export async function classifyIntent<TCtx>(
  message: string,
  domainName: string,
  intents: IntentDefinition<TCtx, unknown>[],
): Promise<IntentClassification> {
  const result = await openaiProvider.complete({
    systemPrompt: buildRouterSystemPrompt(domainName, intents as IntentDefinition<unknown, unknown>[]),
    userPrompt: message,
    temperature: 0,
    maxTokens: 30,
    jsonResponse: true,
  });

  const validIds = new Set<string>([...intents.map((i) => i.id), UNSUPPORTED_INTENT]);

  let intentId = UNSUPPORTED_INTENT;
  try {
    const parsed = JSON.parse(result.content) as { intent?: string };
    if (parsed.intent && validIds.has(parsed.intent)) {
      intentId = parsed.intent;
    }
  } catch {
    // Malformed JSON from the model — fall back to UNSUPPORTED rather than guessing.
  }

  return { intentId, usage: result };
}
