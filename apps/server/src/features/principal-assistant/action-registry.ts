import { z, ZodType } from 'zod';
import { AuthContext } from '../../lib/auth-context';
import { Permission } from '../../lib/permissions';
import { openaiProvider } from '../ai/providers/llm/openai.provider';
import { LLMCompletionOutput } from '../ai/providers/llm/llm-provider.interface';

// ── AI Action Engine ──────────────────────────────────────────────────────────
// Sibling registry to intent-router.ts's read-only IntentDefinition. Actions
// differ from intents in three ways: they extract structured params (not just
// classify), they build an editable, non-mutating preview, and mutation only
// happens in a separate execute() step gated on explicit approval. Adding a
// new action means adding a new actions/*.action.ts file and registering it
// below — this file and the routes/controller/service around it never change.

export interface PreviewField {
  key: string;
  label: string;
  value: unknown;
  type: 'text' | 'date' | 'time' | 'multiselect' | 'textarea';
  editable: boolean;
  options?: { value: string; label: string }[];
}

export interface ActionPreview {
  title: string;
  fields: PreviewField[];
  warnings?: string[];
}

export interface ActionResultSummary {
  summary: string;
  notifiedCount?: number;
}

export interface ActionDefinition<TParams = Record<string, unknown>, TPreviewData = unknown, TResult = unknown> {
  id: string;
  /** Shown to the router LLM verbatim, same convention as IntentDefinition. */
  description: string;
  /** Checked via hasPermission() before both preview and execute. */
  requiredPermission: Permission;
  /** Validates LLM-extracted params AND re-validates possibly-edited params on execute. Every field must have a safe default — see extractActionParams. */
  paramsSchema: ZodType<TParams, z.ZodTypeDef, unknown>;
  /** Plain-English description of the expected JSON fields, fed to the param-extraction prompt. */
  paramsShapeDescription: string;
  /** Read-only: resolves names, checks conflicts, shapes editable preview data. Must never mutate. */
  buildPreview: (ctx: AuthContext, params: TParams) => Promise<TPreviewData>;
  describePreview: (preview: TPreviewData, params: TParams) => ActionPreview;
  /** The only place that mutates — calls the real feature service, never a model directly. */
  execute: (ctx: AuthContext, params: TParams) => Promise<TResult>;
  describeResult: (result: TResult) => ActionResultSummary;
}

export const UNSUPPORTED_ACTION = 'UNSUPPORTED';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyActionDefinition = ActionDefinition<any, any, any>;

export interface ActionClassification {
  actionId: string;
  usage: LLMCompletionOutput;
}

function buildActionRouterSystemPrompt(actions: AnyActionDefinition[]): string {
  const list = actions.map((a) => `- ${a.id}: ${a.description}`).join('\n');
  return `
You are an action-request classifier for a school ERP Principal AI Copilot.
Given the Principal's message, decide whether they are asking to PERFORM one of the following
actions (not just asking a question):

${list}
- ${UNSUPPORTED_ACTION}: the message is not asking to perform any of the actions above.

Respond ONLY with a JSON object of the form {"action": "<ACTION_ID>"}. Do not explain your choice,
do not invent an action id that isn't in the list above.
`.trim();
}

/** Classifies a free-text message against the action registry. Returns UNSUPPORTED_ACTION if none match. */
export async function classifyAction(message: string, actions: AnyActionDefinition[]): Promise<ActionClassification> {
  const result = await openaiProvider.complete({
    systemPrompt: buildActionRouterSystemPrompt(actions),
    userPrompt: message,
    temperature: 0,
    maxTokens: 30,
    jsonResponse: true,
  });

  const validIds = new Set<string>([...actions.map((a) => a.id), UNSUPPORTED_ACTION]);

  let actionId = UNSUPPORTED_ACTION;
  try {
    const parsed = JSON.parse(result.content) as { action?: string };
    if (parsed.action && validIds.has(parsed.action)) {
      actionId = parsed.action;
    }
  } catch {
    // Malformed JSON from the model — fall back to UNSUPPORTED rather than guessing.
  }

  return { actionId, usage: result };
}

function stripNullish(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};
  return Object.fromEntries(Object.entries(obj as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined));
}

export interface ParamExtraction<TParams> {
  params: TParams;
  usage: LLMCompletionOutput;
}

/**
 * Extracts structured params for one action from free text. The model is told to
 * use null for anything the message doesn't clearly state — those fields are
 * stripped before validation so paramsSchema's own defaults fill them in,
 * rather than the model inventing a date/time/name that was never said.
 */
export async function extractActionParams<TParams>(
  message: string,
  action: ActionDefinition<TParams, unknown, unknown>,
): Promise<ParamExtraction<TParams>> {
  const todayISO = new Date().toISOString().slice(0, 10);
  const systemPrompt = `
You extract structured parameters for the "${action.id}" action from a school Principal's
natural-language request.

Today's date is ${todayISO}. Resolve relative dates ("tomorrow", "next Monday", etc.) against
this date, never against your training data.

${action.paramsShapeDescription}

Respond ONLY with a JSON object containing exactly those fields. Use null for any field the
message does not clearly specify or imply — never invent a date, time, or name the Principal
did not state.
`.trim();

  const result = await openaiProvider.complete({
    systemPrompt,
    userPrompt: message,
    temperature: 0,
    maxTokens: 400,
    jsonResponse: true,
  });

  let raw: unknown = {};
  try {
    raw = JSON.parse(result.content);
  } catch {
    raw = {};
  }

  const cleaned = stripNullish(raw);
  const parsed = action.paramsSchema.safeParse(cleaned);
  // Every action's paramsSchema must supply a default for every field, so this
  // fallback always succeeds even when extraction returns nothing usable.
  const params = parsed.success ? parsed.data : action.paramsSchema.parse({});

  return { params, usage: result };
}
