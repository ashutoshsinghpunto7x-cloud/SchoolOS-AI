import OpenAI, { toFile } from 'openai';
import { ISTTProvider, TranscribeInput, TranscribeOutput } from './stt-provider.interface';
import { env } from '../../../../config/env';
import { logger } from '../../../../lib/logger';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 2,
      timeout: 30_000,
    });
  }
  return _client;
}

export const openaiWhisperProvider: ISTTProvider = {
  name: 'openai-whisper',

  isAvailable(): boolean {
    return Boolean(env.OPENAI_API_KEY);
  },

  async transcribe(input: TranscribeInput): Promise<TranscribeOutput> {
    const start = Date.now();
    try {
      const file = await toFile(input.buffer, input.filename, { type: input.mimetype });
      // Always translate to English rather than transcribing verbatim — teachers
      // dictate names in whatever language/script is natural (e.g. Hindi), but the
      // roster stores names in Latin script, so a same-language transcription would
      // never match. The translations endpoint transliterates proper nouns into
      // English/Latin script while translating the rest, which is what matching needs.
      const response = await getClient().audio.translations.create({
        file,
        model: 'whisper-1',
      });

      logger.info('[OpenAiWhisperProvider] Translation OK', { durationMs: Date.now() - start });

      return { text: response.text };
    } catch (err) {
      logger.error('[OpenAiWhisperProvider] Transcription failed', { err });
      throw err;
    }
  },
};
