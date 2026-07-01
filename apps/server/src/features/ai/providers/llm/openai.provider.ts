import OpenAI from 'openai';
import { ILLMProvider, LLMCompletionInput, LLMCompletionOutput } from './llm-provider.interface';
import { env } from '../../../../config/env';
import { logger } from '../../../../lib/logger';

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
      timeout: 30_000,
    });
  }
  return _client;
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
      const response = await getClient().chat.completions.create({
        model,
        temperature: input.temperature ?? 0.4,
        max_tokens: input.maxTokens ?? 600,
        response_format: input.jsonResponse ? { type: 'json_object' } : { type: 'text' },
        messages: [
          { role: 'system', content: input.systemPrompt },
          { role: 'user', content: input.userPrompt },
        ],
      });

      const choice = response.choices[0];
      const content = choice.message.content ?? '';
      const promptTokens = response.usage?.prompt_tokens ?? 0;
      const completionTokens = response.usage?.completion_tokens ?? 0;

      logger.info('[OpenAIProvider] Completion OK', {
        model,
        promptTokens,
        completionTokens,
        durationMs: Date.now() - start,
      });

      return {
        content,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        model,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      logger.error('[OpenAIProvider] Completion failed', { model, err });
      throw err;
    }
  },
};
