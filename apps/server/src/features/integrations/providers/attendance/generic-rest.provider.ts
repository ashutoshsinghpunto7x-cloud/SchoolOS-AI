import { BaseProvider } from '../base.provider';
import type { TestConnectionResult, SyncResult } from '../provider.interface';
import type { IIntegration } from '../../integration.model';
import type { AuthContext } from '../../../../lib/auth-context';

interface GenericRestCredentials {
  baseUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

interface AttendanceRecord {
  userId: string;
  timestamp: string;
  deviceId?: string;
  status?: string;
}

export class GenericRestAttendanceProvider extends BaseProvider {
  readonly providerKey = 'generic_rest_attendance';
  readonly providerType = 'attendance' as const;

  private buildHeaders(creds: GenericRestCredentials): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (creds.apiKey) headers['Authorization'] = `Bearer ${creds.apiKey}`;
    if (creds.username && creds.password) {
      const encoded = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    }
    return headers;
  }

  async testConnection(credentials: Record<string, unknown>): Promise<TestConnectionResult> {
    const creds = credentials as unknown as GenericRestCredentials;
    if (!creds.baseUrl) {
      return { success: false, message: 'Base URL is required' };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${creds.baseUrl}/health`, {
        method: 'GET',
        headers: this.buildHeaders(creds),
        signal: AbortSignal.timeout(10000),
      });

      const latencyMs = Date.now() - start;

      if (response.ok || response.status === 401) {
        // 401 means reachable but auth may need configuring — still "connected"
        return {
          success: true,
          message: response.ok ? 'Connection successful' : 'Device reachable — verify credentials',
          latencyMs,
        };
      }

      return { success: false, message: `HTTP ${response.status}: ${response.statusText}`, latencyMs };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed',
        latencyMs: Date.now() - start,
      };
    }
  }

  async sync(integration: IIntegration, credentials: Record<string, unknown>, _ctx: AuthContext): Promise<SyncResult> {
    const creds = credentials as unknown as GenericRestCredentials;
    const since = integration.lastSyncAt?.toISOString() ?? new Date(0).toISOString();

    try {
      const response = await fetch(`${creds.baseUrl}/attendance?since=${encodeURIComponent(since)}`, {
        method: 'GET',
        headers: this.buildHeaders(creds),
        signal: AbortSignal.timeout(integration.config.timeout),
      });

      if (!response.ok) {
        return this.errorResult([`API returned HTTP ${response.status}: ${response.statusText}`]);
      }

      const body = await response.json() as { records?: AttendanceRecord[] };
      const records: AttendanceRecord[] = body.records ?? [];

      // Records are returned normalized — the Attendance service processes them.
      // Integration service receives SyncResult and dispatches to attendance module.
      return this.successResult(records.length, { records });
    } catch (err) {
      return this.errorResult([err instanceof Error ? err.message : 'Sync failed']);
    }
  }
}
