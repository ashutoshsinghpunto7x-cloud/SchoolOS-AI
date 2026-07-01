import { BaseProvider } from '../base.provider';
import type { TestConnectionResult, SyncResult } from '../provider.interface';
import type { IIntegration } from '../../integration.model';
import type { AuthContext } from '../../../../lib/auth-context';

interface GenericERPCredentials {
  baseUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

/**
 * Generic ERP Connector
 *
 * Connects to any ERP system with a REST API.
 * Pulls student, teacher, and fee records incrementally.
 * Business modules (Student, Teacher, Fee) own record creation — this
 * provider only fetches and normalizes the external data.
 */
export class GenericERPProvider extends BaseProvider {
  readonly providerKey = 'generic_erp';
  readonly providerType = 'erp' as const;

  private buildHeaders(creds: GenericERPCredentials): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (creds.apiKey) headers['Authorization'] = `Bearer ${creds.apiKey}`;
    if (creds.username && creds.password) {
      headers['Authorization'] = `Basic ${Buffer.from(`${creds.username}:${creds.password}`).toString('base64')}`;
    }
    return headers;
  }

  async testConnection(credentials: Record<string, unknown>): Promise<TestConnectionResult> {
    const creds = credentials as unknown as GenericERPCredentials;
    if (!creds.baseUrl) return { success: false, message: 'Base URL is required' };

    const start = Date.now();
    try {
      const response = await fetch(creds.baseUrl, {
        method: 'HEAD',
        headers: this.buildHeaders(creds),
        signal: AbortSignal.timeout(10000),
      });
      return {
        success: response.ok || response.status < 500,
        message: response.ok ? 'ERP system reachable' : `ERP responded with HTTP ${response.status}`,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'ERP connection failed', latencyMs: Date.now() - start };
    }
  }

  async sync(integration: IIntegration, credentials: Record<string, unknown>, _ctx: AuthContext): Promise<SyncResult> {
    const creds = credentials as unknown as GenericERPCredentials;
    const since = integration.lastSyncAt?.toISOString() ?? new Date(0).toISOString();
    const errors: string[] = [];
    let totalSynced = 0;

    const endpoints = [
      { path: `/students?updatedSince=${encodeURIComponent(since)}`, entity: 'students' },
      { path: `/teachers?updatedSince=${encodeURIComponent(since)}`, entity: 'teachers' },
    ];

    const allData: Record<string, unknown[]> = {};

    for (const ep of endpoints) {
      try {
        const response = await fetch(`${creds.baseUrl}${ep.path}`, {
          headers: this.buildHeaders(creds),
          signal: AbortSignal.timeout(integration.config.timeout),
        });
        if (!response.ok) {
          errors.push(`${ep.entity}: HTTP ${response.status}`);
          continue;
        }
        const body = await response.json() as { data?: unknown[] } | unknown[];
        const records = Array.isArray(body) ? body : (body as { data?: unknown[] }).data ?? [];
        allData[ep.entity] = records;
        totalSynced += records.length;
      } catch (err) {
        errors.push(`${ep.entity}: ${err instanceof Error ? err.message : 'fetch failed'}`);
      }
    }

    return {
      success: errors.length === 0,
      recordsSynced: totalSynced,
      recordsFailed: 0,
      errors,
      metadata: allData,
    };
  }
}
