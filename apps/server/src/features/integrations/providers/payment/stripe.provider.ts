import { BaseProvider } from '../base.provider';
import type { TestConnectionResult, SyncResult } from '../provider.interface';
import type { IIntegration } from '../../integration.model';
import type { AuthContext } from '../../../../lib/auth-context';

interface StripeCredentials {
  secretKey: string;
  publishableKey?: string;
  webhookSecret?: string;
}

/**
 * Stripe Payment Provider — Architecture stub.
 * Receives payment webhooks and forwards to Fee module for reconciliation.
 */
export class StripeProvider extends BaseProvider {
  readonly providerKey = 'stripe';
  readonly providerType = 'payment' as const;

  async testConnection(credentials: Record<string, unknown>): Promise<TestConnectionResult> {
    const creds = credentials as unknown as StripeCredentials;
    if (!creds.secretKey) return { success: false, message: 'Secret key is required' };

    const start = Date.now();
    try {
      const response = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${creds.secretKey}` },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;
      if (response.ok) return { success: true, message: 'Stripe credentials valid', latencyMs };
      if (response.status === 401) return { success: false, message: 'Invalid Stripe secret key', latencyMs };
      return { success: false, message: `Stripe API error: HTTP ${response.status}`, latencyMs };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Connection failed', latencyMs: Date.now() - start };
    }
  }

  async sync(integration: IIntegration, credentials: Record<string, unknown>, _ctx: AuthContext): Promise<SyncResult> {
    const creds = credentials as unknown as StripeCredentials;
    const created = integration.lastSyncAt
      ? Math.floor(integration.lastSyncAt.getTime() / 1000)
      : Math.floor(Date.now() / 1000) - 86400;

    try {
      const response = await fetch(
        `https://api.stripe.com/v1/charges?created[gte]=${created}&limit=100`,
        {
          headers: { Authorization: `Bearer ${creds.secretKey}` },
          signal: AbortSignal.timeout(integration.config.timeout),
        }
      );
      if (!response.ok) return this.errorResult([`Stripe API error: HTTP ${response.status}`]);
      const body = await response.json() as { data?: unknown[] };
      return this.successResult((body.data ?? []).length, { charges: body.data });
    } catch (err) {
      return this.errorResult([err instanceof Error ? err.message : 'Stripe sync failed']);
    }
  }
}
