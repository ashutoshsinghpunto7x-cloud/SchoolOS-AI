import { BaseProvider } from '../base.provider';
import type { TestConnectionResult, SyncResult } from '../provider.interface';
import type { IIntegration } from '../../integration.model';
import type { AuthContext } from '../../../../lib/auth-context';

interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
  verifyToken?: string;
}

/**
 * WhatsApp Business API Provider
 *
 * Validates credentials and exposes the phone number ID needed
 * by the existing Communication Platform to route WhatsApp messages.
 * Does not duplicate communication business logic.
 */
export class WhatsAppBusinessProvider extends BaseProvider {
  readonly providerKey = 'whatsapp_business';
  readonly providerType = 'communication' as const;

  private getGraphUrl(creds: WhatsAppCredentials): string {
    return `https://graph.facebook.com/v18.0/${creds.phoneNumberId}`;
  }

  async testConnection(credentials: Record<string, unknown>): Promise<TestConnectionResult> {
    const creds = credentials as unknown as WhatsAppCredentials;
    if (!creds.phoneNumberId || !creds.accessToken) {
      return { success: false, message: 'Phone Number ID and Access Token are required' };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${this.getGraphUrl(creds)}?fields=id,display_phone_number,verified_name`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
        return { success: false, message: body.error?.message ?? `Graph API error: HTTP ${response.status}`, latencyMs };
      }

      const data = await response.json() as { display_phone_number?: string; verified_name?: string };
      return {
        success: true,
        message: `Connected: ${data.display_phone_number ?? ''} (${data.verified_name ?? ''})`,
        latencyMs,
        details: data,
      };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'WhatsApp API connection failed', latencyMs: Date.now() - start };
    }
  }

  // Communication providers don't pull records — they push.
  // Sync is a no-op; messages are sent through the Communication Platform.
  async sync(_integration: IIntegration, _credentials: Record<string, unknown>, _ctx: AuthContext): Promise<SyncResult> {
    return this.successResult(0, { note: 'WhatsApp provider does not pull records — messages are sent through the Communication Platform' });
  }
}
