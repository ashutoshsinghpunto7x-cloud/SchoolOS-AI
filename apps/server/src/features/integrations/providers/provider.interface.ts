import type { AuthContext } from '../../../lib/auth-context';
import type { IIntegration, IntegrationProviderType } from '../integration.model';

// ── Result Types ──────────────────────────────────────────────────────────────

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  recordsFailed: number;
  errors: string[];
  metadata?: Record<string, unknown>;
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs?: number;
  message?: string;
  checkedAt: Date;
}

export interface NormalizedRecord {
  externalId: string;
  data: Record<string, unknown>;
  timestamp?: Date;
}

// ── Provider Definition (static catalog metadata) ────────────────────────────

export interface ProviderDefinition {
  providerKey: string;
  providerType: IntegrationProviderType;
  name: string;
  description: string;
  logoUrl?: string;
  credentialFields: CredentialField[];
  configDefaults: {
    syncInterval: number;
    timeout: number;
    retryCount: number;
  };
  capabilities: ProviderCapability[];
  documentationUrl?: string;
  comingSoon?: boolean;
}

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  helpText?: string;
}

export type ProviderCapability =
  | 'sync_pull'       // pull records from external system
  | 'sync_push'       // push records to external system
  | 'webhook_inbound' // receive webhooks from external system
  | 'webhook_outbound'// send webhooks to external system
  | 'test_connection' // supports connection testing
  | 'health_check'    // supports health checks
  | 'incremental_sync'// supports delta/incremental sync
  | 'manual_sync';    // supports on-demand manual sync

// ── IProvider Interface ───────────────────────────────────────────────────────

export interface IProvider {
  readonly providerKey: string;
  readonly providerType: IntegrationProviderType;

  /**
   * Test that credentials are valid and the external system is reachable.
   * Must NOT write to MongoDB. Must NOT throw — return success: false on failure.
   */
  testConnection(credentials: Record<string, unknown>): Promise<TestConnectionResult>;

  /**
   * Pull records from the external system and return them normalized.
   * Business modules process the normalized records after this returns.
   * Must NOT throw — return errors in SyncResult.errors.
   */
  sync(integration: IIntegration, credentials: Record<string, unknown>, ctx: AuthContext): Promise<SyncResult>;

  /**
   * Return the current health status of the integration.
   * Must NOT throw.
   */
  getHealth(integration: IIntegration, credentials: Record<string, unknown>): Promise<HealthStatus>;
}
