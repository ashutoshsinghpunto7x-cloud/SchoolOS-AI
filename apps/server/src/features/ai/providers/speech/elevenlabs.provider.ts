import axios from 'axios';
import { ISpeechProvider, SpeechInput, SpeechOutput } from './speech-provider.interface';
import { env } from '../../../../config/env';
import { logger } from '../../../../lib/logger';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_MODEL = 'eleven_multilingual_v2';

// ── Provider ──────────────────────────────────────────────────────────────────

export const elevenLabsProvider: ISpeechProvider = {
  name: 'elevenlabs',

  isAvailable(): boolean {
    return Boolean(env.ELEVENLABS_API_KEY);
  },

  async speak(input: SpeechInput): Promise<SpeechOutput> {
    if (!env.ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs not configured: ELEVENLABS_API_KEY is required');
    }

    const voiceId = input.voiceId ?? env.ELEVENLABS_VOICE_ID;
    const start = Date.now();

    const response = await axios.post<Buffer>(
      `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
      {
        text: input.text,
        model_id: DEFAULT_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      },
      {
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 30_000,
      }
    );

    const audioBase64 = Buffer.from(response.data).toString('base64');
    const durationMs = Date.now() - start;

    logger.info('[ElevenLabsProvider] Speech generated', {
      voiceId,
      textLength: input.text.length,
      durationMs,
    });

    return {
      audioBase64,
      durationMs,
      model: DEFAULT_MODEL,
    };
  },
};
