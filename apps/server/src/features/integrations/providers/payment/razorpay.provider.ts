import { BaseProvider } from '../base.provider';
import type { TestConnectionResult, SyncResult } from '../provider.interface';
import type { IIntegration } from '../../integration.model';
import type { AuthContext } from '../../../../lib/auth-context';

interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

/**
 * Razorpay Payment Provider
 *
 * Receives payment webhooks from Razorpay and forwards payment events
 * to the Fee module for reconciliation. Business logic stays in the Fee module.
 * No fee records are created here — the sync returns normalized payment data.
 */
export class RazorpayProvider extends BaseProvider {
  readonly providerKey = 'razorpay';
  readonly providerType = 'payment' as const;

  private buildAuthHeader(creds: RazorpayCredentials): string {
    return `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64')}`;
  }

  async testConnection(credentials: Record<string, unknown>): Promise<TestConnectionResult> {
    const creds = credentials as unknown as RazorpayCredentials;
    if (!creds.keyId || !creds.keySecret) {
      return { success: false, message: 'Key ID and Key Secret are required' };
    }

    const start = Date.now();
    try {
      const response = await fetch('https://api.razorpay.com/v1/payments?count=1', {
        headers: { Authorization: this.buildAuthHeader(creds) },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;

      if (response.ok) return { success: true, message: 'Razorpay credentials valid', latencyMs };
      if (response.status === 401) return { success: false, message: 'Invalid Razorpay credentials', latencyMs };
      return { success: false, message: `Razorpay API error: HTTP ${response.status}`, latencyMs };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Razorpay connection failed',
        latencyMs: Date.now() - start,
      };
    }
  }

  async sync(integration: IIntegration, credentials: Record<string, unknown>, _ctx: AuthContext): Promise<SyncResult> {
    const creds = credentials as unknown as RazorpayCredentials;
    const from = integration.lastSyncAt
      ? Math.floor(integration.lastSyncAt.getTime() / 1000)
      : Math.floor(Date.now() / 1000) - 86400;

    try {
      const response = await fetch(
        `https://api.razorpay.com/v1/payments?from=${from}&count=100`,
        {
          headers: { Authorization: this.buildAuthHeader(creds) },
          signal: AbortSignal.timeout(integration.config.timeout),
        }
      );

      if (!response.ok) {
        return this.errorResult([`Razorpay API error: HTTP ${response.status}`]);
      }

      const body = await response.json() as { items?: unknown[]; count?: number };
      const payments = body.items ?? [];

      // Payment data is returned normalized; Fee module handles reconciliation.
      return this.successResult(payments.length, { payments });
    } catch (err) {
      return this.errorResult([err instanceof Error ? err.message : 'Razorpay sync failed']);
    }
  }

  /**
   * Verify HMAC-SHA256 webhook signature from Razorpay.
   * Called by the webhook controller before processing.
   */
  static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto') as typeof import('crypto');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}
