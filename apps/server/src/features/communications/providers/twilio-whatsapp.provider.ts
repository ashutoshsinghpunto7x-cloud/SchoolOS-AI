import { ICommunicationProvider, TriggerPayload } from './provider.interface';
import { Communication } from '../communication.model';
import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01/Accounts';

export function isTwilioConfigured(): boolean {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);
}

export const twilioWhatsAppProvider: ICommunicationProvider = {
  name: 'twilio',

  supports(type) {
    return type === 'whatsapp';
  },

  trigger(payload: TriggerPayload): void {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = env;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      logger.error('[TwilioWhatsApp] Missing credentials — cannot send message', {
        communicationId: payload.communicationId,
      });
      Communication.findByIdAndUpdate(payload.communicationId, {
        $set: { status: 'FAILED' },
      }).catch(() => {});
      return;
    }

    // Strip non-digits then re-add country code prefix if needed.
    // parentPhone is stored as 10-digit Indian number, Twilio needs E.164 (+91XXXXXXXXXX).
    const digits = payload.parentPhone.replace(/\D/g, '');
    const e164 = digits.startsWith('91') ? `+${digits}` : `+91${digits}`;

    const toNumber   = `whatsapp:${e164}`;
    const fromNumber = `whatsapp:${TWILIO_WHATSAPP_FROM}`;
    const body       = payload.message ?? '';

    const url  = `${TWILIO_API_BASE}/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: toNumber, From: fromNumber, Body: body }).toString(),
      signal: AbortSignal.timeout(15_000),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { message?: string; code?: number };
          throw new Error(`Twilio ${res.status}: ${data.message ?? res.statusText} (code ${data.code ?? '?'})`);
        }
        const data = await res.json() as { sid: string; status: string };
        return Communication.findByIdAndUpdate(payload.communicationId, {
          $set: {
            status: 'COMPLETED',
            metadata: { twilioSid: data.sid, twilioStatus: data.status },
          },
        });
      })
      .then(() => {
        logger.info('[TwilioWhatsApp] Message sent', { communicationId: payload.communicationId });
      })
      .catch((err: unknown) => {
        logger.error('[TwilioWhatsApp] Send failed', {
          communicationId: payload.communicationId,
          err: err instanceof Error ? err.message : err,
        });
        Communication.findByIdAndUpdate(payload.communicationId, {
          $set: { status: 'FAILED' },
        }).catch(() => {});
      });
  },
};
