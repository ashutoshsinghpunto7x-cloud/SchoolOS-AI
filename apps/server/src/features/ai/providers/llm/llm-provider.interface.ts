// ── LLM Provider Interface ────────────────────────────────────────────────────
// Every LLM (OpenAI, Gemini, Claude, Grok) must implement this contract.
// Business logic calls this interface — never a concrete provider directly.

export interface LLMCompletionInput {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  /** When true, instructs the model to respond with valid JSON only. */
  jsonResponse?: boolean;
}

export interface LLMCompletionOutput {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  durationMs: number;
}

export interface ILLMProvider {
  readonly name: string;
  readonly model: string;
  isAvailable(): boolean;
  complete(input: LLMCompletionInput): Promise<LLMCompletionOutput>;
}
