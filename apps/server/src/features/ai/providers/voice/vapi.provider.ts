import axios from 'axios';
import { IVoiceProvider, CreateCallInput, CreateCallOutput } from './voice-provider.interface';
import { env } from '../../../../config/env';
import { logger } from '../../../../lib/logger';

const VAPI_BASE = 'https://api.vapi.ai';

function getHeaders() {
  return {
    Authorization: `Bearer ${env.VAPI_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// ── Vapi call response shape (minimal) ───────────────────────────────────────

interface VapiCallResponse {
  id: string;
  status: string;
  phoneCallProvider?: string;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export const vapiProvider: IVoiceProvider = {
  name: 'vapi',

  isAvailable(): boolean {
    return Boolean(env.VAPI_API_KEY && env.VAPI_PHONE_NUMBER_ID);
  },

  async createCall(input: CreateCallInput): Promise<CreateCallOutput> {
    if (!env.VAPI_API_KEY || !env.VAPI_PHONE_NUMBER_ID) {
      throw new Error('Vapi not configured: VAPI_API_KEY and VAPI_PHONE_NUMBER_ID are required');
    }

    const body: Record<string, unknown> = {
      phoneNumberId: env.VAPI_PHONE_NUMBER_ID,
      customer: { number: input.toNumber },
    };

    if (env.VAPI_ASSISTANT_ID) {
      body.assistantId = env.VAPI_ASSISTANT_ID;
      if (input.assistant) {
        // Pass overrides when using a pre-built assistant
        body.assistantOverrides = {
          firstMessage: input.assistant.firstMessage,
          model: input.assistant.model,
        };
      }
    } else if (input.assistant) {
      body.assistant = {
        name: input.assistant.name ?? 'SchoolOS AI',
        firstMessage: input.assistant.firstMessage,
        model: {
          provider: input.assistant.model.provider,
          model: input.assistant.model.model,
          systemPrompt: input.assistant.model.systemPrompt,
          temperature: input.assistant.model.temperature ?? 0.5,
          maxTokens: input.assistant.model.maxTokens ?? 300,
        },
        voice: input.assistant.voice
          ? { provider: input.assistant.voice.provider, voiceId: input.assistant.voice.voiceId }
          : { provider: '11labs', voiceId: env.ELEVENLABS_VOICE_ID },
        endCallMessage: input.assistant.endCallMessage ?? 'Thank you for your time. Have a good day!',
        maxDurationSeconds: input.assistant.maxDurationSeconds ?? 300,
        backgroundSound: input.assistant.backgroundSound ?? 'office',
        recordingEnabled: input.assistant.recordingEnabled ?? false,
      };
    } else {
      throw new Error('Either VAPI_ASSISTANT_ID or an inline assistant config is required');
    }

    if (input.metadata) {
      body.metadata = input.metadata;
    }

    const response = await axios.post<VapiCallResponse>(`${VAPI_BASE}/call`, body, {
      headers: getHeaders(),
      timeout: 15_000,
    });

    logger.info('[VapiProvider] Call created', {
      callId: response.data.id,
      toNumber: input.toNumber,
      status: response.data.status,
    });

    return {
      callId: response.data.id,
      status: response.data.status,
      provider: 'vapi',
    };
  },
};
