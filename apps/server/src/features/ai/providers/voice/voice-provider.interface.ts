// ── Voice Provider Interface ──────────────────────────────────────────────────
// Every voice/calling provider (Vapi, Retell, Bland) must implement this.
// Changing from Vapi to Retell requires only a new provider — no service changes.

export interface VapiVoiceConfig {
  provider: 'vapi';
  voiceId: string;
  language?: string;
}

export interface VapiModelConfig {
  provider: 'openai';
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface InlineAssistantConfig {
  name?: string;
  firstMessage: string;
  model: VapiModelConfig;
  voice?: VapiVoiceConfig;
  endCallMessage?: string;
  maxDurationSeconds?: number;
  backgroundSound?: 'office' | 'off';
  recordingEnabled?: boolean;
}

export interface CreateCallInput {
  /** E.164 format: +91XXXXXXXXXX */
  toNumber: string;
  /** Use a pre-configured assistant from the provider's dashboard. */
  assistantId?: string;
  /** Inline assistant definition — used when assistantId is not configured. */
  assistant?: InlineAssistantConfig;
  /** Arbitrary key-value pairs attached to the call for webhook correlation. */
  metadata?: Record<string, string>;
}

export interface CreateCallOutput {
  callId: string;
  status: string;
  provider: string;
}

export interface IVoiceProvider {
  readonly name: string;
  isAvailable(): boolean;
  createCall(input: CreateCallInput): Promise<CreateCallOutput>;
}
