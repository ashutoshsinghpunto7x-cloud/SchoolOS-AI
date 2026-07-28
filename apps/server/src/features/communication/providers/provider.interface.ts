import { NotificationChannel } from '../notification-types';

export interface SendResult {
  success: boolean;
  /** Provider-side message id — Meta's `wamid...` for WhatsApp, etc. */
  providerMessageId?: string;
  errorMessage?: string;
}

export interface SendTextParams {
  to: string;
  body: string;
}

/** Meta "message template" (pre-approved by Meta, required to message a user
 *  outside the 24h session window) — distinct from this engine's own editable
 *  MessageTemplate documents, which render to plain text sent via sendText. */
export interface SendTemplateParams {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<Record<string, unknown>>;
}

export interface SendMediaParams {
  to: string;
  mediaUrl: string;
  mediaType: 'image' | 'document' | 'video' | 'audio';
  caption?: string;
  filename?: string;
}

export interface SendButtonsParams {
  to: string;
  bodyText: string;
  buttons: Array<{ id: string; title: string }>;
}

export interface SendInteractiveListParams {
  to: string;
  bodyText: string;
  buttonText: string;
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
}

/**
 * Contract every channel provider implements. Only `whatsapp-cloud.provider.ts`
 * actually sends today (email/sms/push are registered stubs — see
 * provider-registry.ts) — CommunicationService never needs to change when a
 * new channel is wired up, only provider-registry.ts's lookup table does.
 */
export interface ICommunicationChannelProvider {
  readonly channel: NotificationChannel;

  /** True if this provider has the credentials it needs to actually send. */
  isConfigured(): boolean;

  sendText(params: SendTextParams): Promise<SendResult>;
  sendTemplate(params: SendTemplateParams): Promise<SendResult>;
  sendMedia(params: SendMediaParams): Promise<SendResult>;
  /** Concurrency-limited fan-out — see whatsapp-cloud.provider.ts for the real implementation. */
  sendBulk(recipients: SendTextParams[]): Promise<SendResult[]>;

  // Future-ready, WhatsApp-specific interactive message types. Optional so a
  // future email/SMS provider isn't forced to implement a no-op.
  sendButtons?(params: SendButtonsParams): Promise<SendResult>;
  sendInteractiveList?(params: SendInteractiveListParams): Promise<SendResult>;
}
