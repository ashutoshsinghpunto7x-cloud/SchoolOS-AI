import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import {
  ICommunicationChannelProvider,
  SendResult,
  SendTextParams,
  SendTemplateParams,
  SendMediaParams,
  SendButtonsParams,
  SendInteractiveListParams,
} from './provider.interface';

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 15_000;

function graphUrl(): string {
  return `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

/** parentPhone is stored as a bare 10-digit Indian number (see Student model);
 *  Meta's Cloud API expects international format digits with no leading '+'. */
export function toMetaPhoneFormat(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  return digits.startsWith('91') ? digits : `91${digits}`;
}

interface GraphSuccessBody {
  messages?: Array<{ id: string }>;
}
interface GraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number };
}

// 4xx (except 429) are permanent — bad number, unsupported message type, policy
// violation — retrying identically will only fail identically. 429/5xx and
// network errors are transient and worth retrying.
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function postToGraph(body: Record<string, unknown>): Promise<SendResult> {
  if (!isWhatsAppCloudConfigured()) {
    return { success: false, errorMessage: 'WhatsApp Cloud API is not configured (missing WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)' };
  }

  let lastError = 'Unknown error';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(graphUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (res.ok) {
        const data = (await res.json()) as GraphSuccessBody;
        return { success: true, providerMessageId: data.messages?.[0]?.id };
      }

      const errorBody = (await res.json().catch(() => ({}))) as GraphErrorBody;
      lastError = `Meta API ${res.status}: ${errorBody.error?.message ?? res.statusText} (code ${errorBody.error?.code ?? '?'})`;

      if (!isRetryableStatus(res.status) || attempt === MAX_ATTEMPTS) {
        logger.error('[WhatsAppCloud] Send failed (permanent or out of retries)', { attempt, status: res.status, lastError });
        return { success: false, errorMessage: lastError };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error calling Meta Graph API';
      if (attempt === MAX_ATTEMPTS) {
        logger.error('[WhatsAppCloud] Send failed after retries', { attempt, lastError });
        return { success: false, errorMessage: lastError };
      }
    }

    // Exponential backoff before the next attempt: 500ms, 1000ms, ...
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
  }

  return { success: false, errorMessage: lastError };
}

export function isWhatsAppCloudConfigured(): boolean {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

// Modest fixed concurrency + stagger — keeps us well under Meta's per-second
// throughput tiers without needing to know which tier this business number is on.
const BULK_CONCURRENCY = 5;
const BULK_STAGGER_MS = 200;

export const whatsAppCloudProvider: ICommunicationChannelProvider = {
  channel: 'whatsapp',

  isConfigured: isWhatsAppCloudConfigured,

  async sendText({ to, body }: SendTextParams): Promise<SendResult> {
    return postToGraph({
      to: toMetaPhoneFormat(to),
      type: 'text',
      text: { body },
    });
  },

  async sendTemplate({ to, templateName, languageCode = 'en_US', components }: SendTemplateParams): Promise<SendResult> {
    return postToGraph({
      to: toMetaPhoneFormat(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {}),
      },
    });
  },

  async sendMedia({ to, mediaUrl, mediaType, caption, filename }: SendMediaParams): Promise<SendResult> {
    return postToGraph({
      to: toMetaPhoneFormat(to),
      type: mediaType,
      [mediaType]: {
        link: mediaUrl,
        ...(caption ? { caption } : {}),
        ...(filename && mediaType === 'document' ? { filename } : {}),
      },
    });
  },

  async sendButtons({ to, bodyText, buttons }: SendButtonsParams): Promise<SendResult> {
    return postToGraph({
      to: toMetaPhoneFormat(to),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: { buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })) },
      },
    });
  },

  async sendInteractiveList({ to, bodyText, buttonText, sections }: SendInteractiveListParams): Promise<SendResult> {
    return postToGraph({
      to: toMetaPhoneFormat(to),
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: { button: buttonText, sections },
      },
    });
  },

  async sendBulk(recipients: SendTextParams[]): Promise<SendResult[]> {
    const results: SendResult[] = new Array(recipients.length);
    let cursor = 0;

    async function worker(): Promise<void> {
      while (cursor < recipients.length) {
        const index = cursor++;
        results[index] = await whatsAppCloudProvider.sendText(recipients[index]);
        if (BULK_STAGGER_MS > 0) await new Promise((resolve) => setTimeout(resolve, BULK_STAGGER_MS));
      }
    }

    await Promise.all(Array.from({ length: Math.min(BULK_CONCURRENCY, recipients.length) }, worker));
    return results;
  },
};
