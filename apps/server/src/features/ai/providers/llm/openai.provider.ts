import OpenAI from 'openai';
import { ILLMProvider, LLMCompletionInput, LLMCompletionOutput } from './llm-provider.interface';
import { env } from '../../../../config/env';
import { logger } from '../../../../lib/logger';
import { Semaphore } from '../../../../lib/semaphore';

// ── Cost map: USD per 1M tokens (input / output) ──────────────────────────────
const COST_MAP: Record<string, [number, number]> = {
  'gpt-4o-mini':        [0.15,  0.60],
  'gpt-4o':             [5.00, 15.00],
  'gpt-4o-2024-11-20':  [2.50, 10.00],
  'gpt-4-turbo':        [10.0, 30.00],
};

export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const [inputRate, outputRate] = COST_MAP[model] ?? [0, 0];
  return (promptTokens / 1_000_000) * inputRate + (completionTokens / 1_000_000) * outputRate;
}

// ── OpenAI Client (lazy singleton) ───────────────────────────────────────────

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 3,
      // Raised from 30s — batched question-generation calls can legitimately run longer
      // (larger maxTokens for bigger batches); a tight timeout would abort a slow-but-fine
      // completion and look identical to a real failure to the caller.
      timeout: 60_000,
    });
  }
  return _client;
}

// ── Global concurrency + rate-limit backoff ─────────────────────────────────────
// A per-job concurrency cap (e.g. "5 pages at a time" in chapter capture) only bounds one
// teacher's one job — it does nothing to stop ten jobs across ten teachers from summing to
// far more than the org's shared tokens-per-minute budget. This semaphore is process-wide, so
// no matter how many jobs are in flight at once, only AI_MAX_CONCURRENCY OpenAI calls are ever
// actually running; everything else queues instead of firing and colliding into a 429.
const aiConcurrency = new Semaphore(env.AI_MAX_CONCURRENCY);

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_BASE_BACKOFF_MS = 1500;
const RATE_LIMIT_MAX_BACKOFF_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { status?: number }).status === 429;
}

/** Reads a numeric Retry-After header (seconds) off an OpenAI APIError, if the response sent one. */
function retryAfterMs(err: unknown): number | null {
  const headers = (err as { headers?: Record<string, string> } | undefined)?.headers;
  const raw = headers?.['retry-after'];
  const seconds = raw ? Number(raw) : NaN;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

/**
 * Runs one OpenAI call inside the global concurrency slot, with its own backoff-and-retry loop
 * for 429s on top of the SDK's own (smaller) retry budget — this is what makes extraction jobs
 * survive a sustained burst of load instead of surfacing a rate-limit error to the teacher. The
 * slot is released between attempts (not held for the whole backoff) so a slow-recovering call
 * doesn't also starve every other queued request of concurrency while it waits.
 */
async function callWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= RATE_LIMIT_MAX_ATTEMPTS; attempt++) {
    try {
      return await aiConcurrency.run(fn);
    } catch (err) {
      const isLastAttempt = attempt === RATE_LIMIT_MAX_ATTEMPTS;
      if (!isRateLimitError(err) || isLastAttempt) throw err;

      const backoff = retryAfterMs(err)
        ?? Math.min(RATE_LIMIT_MAX_BACKOFF_MS, RATE_LIMIT_BASE_BACKOFF_MS * 2 ** (attempt - 1)) + Math.random() * 500;
      logger.warn('[OpenAIProvider] Rate limited — backing off and retrying', { attempt, backoffMs: Math.round(backoff) });
      await sleep(backoff);
    }
  }
  // Unreachable (the loop always returns or throws on its last attempt) — satisfies TypeScript.
  throw new Error('Rate limit retry loop exited without resolving');
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const openaiProvider: ILLMProvider = {
  name: 'openai',
  model: env.OPENAI_MODEL,

  isAvailable(): boolean {
    return Boolean(env.OPENAI_API_KEY);
  },

  async complete(input: LLMCompletionInput): Promise<LLMCompletionOutput> {
    const start = Date.now();
    const model = env.OPENAI_MODEL;

    try {
      const userContent: OpenAI.Chat.ChatCompletionContentPart[] | string = input.imageDataUri
        ? [
            { type: 'text', text: input.userPrompt },
            { type: 'image_url', image_url: { url: input.imageDataUri, detail: 'high' } },
          ]
        : input.userPrompt;

      const response = await callWithBackoff(() => getClient().chat.completions.create({
        model,
        temperature: input.temperature ?? 0.4,
        max_tokens: input.maxTokens ?? 600,
        response_format: input.jsonResponse ? { type: 'json_object' } : { type: 'text' },
        messages: [
          { role: 'system', content: input.systemPrompt },
          { role: 'user', content: userContent },
        ],
      }));

      const choice = response.choices[0];
      const content = choice.message.content ?? '';
      const promptTokens = response.usage?.prompt_tokens ?? 0;
      const completionTokens = response.usage?.completion_tokens ?? 0;
      const finishReason = choice.finish_reason;

      logger.info('[OpenAIProvider] Completion OK', {
        model,
        promptTokens,
        completionTokens,
        finishReason,
        durationMs: Date.now() - start,
      });
      if (finishReason === 'length') {
        // Not an error by itself — callers that asked for structured JSON treat this as a
        // signal to retry with a smaller ask/bigger budget rather than failing outright.
        logger.warn('[OpenAIProvider] Completion truncated by maxTokens', { model, completionTokens });
      }

      return {
        content,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        model,
        durationMs: Date.now() - start,
        finishReason,
      };
    } catch (err) {
      logger.error('[OpenAIProvider] Completion failed', { model, err });
      throw err;
    }
  },
};
