// ── Speech-to-Text Provider Interface ────────────────────────────────────────
// Every transcription provider (OpenAI Whisper, Deepgram, etc.) must implement
// this contract. Business logic calls this interface — never a concrete
// provider directly.

export interface TranscribeInput {
  buffer: Buffer;
  mimetype: string;
  /** Original filename — some providers use the extension to pick a decoder. */
  filename: string;
}

export interface TranscribeOutput {
  text: string;
  durationSeconds?: number;
}

export interface ISTTProvider {
  readonly name: string;
  isAvailable(): boolean;
  transcribe(input: TranscribeInput): Promise<TranscribeOutput>;
}
