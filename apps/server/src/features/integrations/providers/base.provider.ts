import type { IProvider, TestConnectionResult, SyncResult, HealthStatus } from './provider.interface';
import type { IIntegration, IntegrationProviderType } from '../integration.model';
import type { AuthContext } from '../../../lib/auth-context';

/**
 * Abstract base class for all integration providers.
 * Subclasses implement testConnection(), sync(), and optionally getHealth().
 */
export abstract class BaseProvider implements IProvider {
  abstract readonly providerKey: string;
  abstract readonly providerType: IntegrationProviderType;

  abstract testConnection(credentials: Record<string, unknown>): Promise<TestConnectionResult>;

  abstract sync(integration: IIntegration, credentials: Record<string, unknown>, ctx: AuthContext): Promise<SyncResult>;

  async getHealth(_integration: IIntegration, credentials: Record<string, unknown>): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const result = await this.testConnection(credentials);
      return {
        healthy: result.success,
        latencyMs: Date.now() - start,
        message: result.message,
        checkedAt: new Date(),
      };
    } catch {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        message: 'Health check failed',
        checkedAt: new Date(),
      };
    }
  }

  /** Build a standardized sync error result without throwing. */
  protected errorResult(errors: string[]): SyncResult {
    return { success: false, recordsSynced: 0, recordsFailed: 0, errors };
  }

  /** Build a successful sync result. */
  protected successResult(recordsSynced: number, metadata?: Record<string, unknown>): SyncResult {
    return { success: true, recordsSynced, recordsFailed: 0, errors: [], metadata };
  }
}
