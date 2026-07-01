import type { CommunicationType, CommProvider } from '../communication.model';

// ── Payload sent to any provider ─────────────────────────────────────────────

export interface TriggerPayload {
  communicationId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  schoolName: string;
  type: CommunicationType;
  /** Raw message body — required for whatsapp/sms/email types. */
  message?: string;
  metadata?: Record<string, unknown>;
}

// ── Provider contract ─────────────────────────────────────────────────────────

/**
 * Every communication provider implements this interface.
 *
 * `trigger` is fire-and-forget: it MUST NOT be awaited by the caller.
 * Completion callbacks arrive via POST /communications/webhook.
 *
 * Providers that complete synchronously (notes, mock simulation) update
 * the DB directly instead of going through the webhook path.
 */
export interface ICommunicationProvider {
  /** Identifier stored on the Communication document. */
  readonly name: CommProvider;

  /** Returns true if this provider can handle the given communication type. */
  supports(type: CommunicationType): boolean;

  /**
   * Fire-and-forget.
   * Should never throw — errors must be caught and logged internally.
   */
  trigger(payload: TriggerPayload): void;
}
