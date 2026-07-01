// ── Speech Provider Interface ─────────────────────────────────────────────────
// Every TTS provider (ElevenLabs, Cartesia, Deepgram) must implement this.

export interface SpeechInput {
  text: string;
  voiceId?: string;
  language?: string;
  /** Output format — defaults to mp3_44100_128 */
  outputFormat?: string;
}

export interface SpeechOutput {
  /** Base64-encoded audio data. */
  audioBase64?: string;
  /** Pre-signed URL if provider returns a link instead of bytes. */
  audioUrl?: string;
  durationMs?: number;
  model?: string;
}

export interface ISpeechProvider {
  readonly name: string;
  isAvailable(): boolean;
  speak(input: SpeechInput): Promise<SpeechOutput>;
}
