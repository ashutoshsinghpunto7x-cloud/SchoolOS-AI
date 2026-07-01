import { BaseProvider } from '../base.provider';
import type { TestConnectionResult, SyncResult } from '../provider.interface';
import type { IIntegration } from '../../integration.model';
import type { AuthContext } from '../../../../lib/auth-context';

interface ZKTecoCredentials {
  deviceIp: string;
  devicePort?: string;
  password?: string;
}

/**
 * ZKTeco Biometric Provider
 *
 * Extension of GenericRest adapted for ZKTeco's proprietary protocol.
 * Real implementation requires the zkteco-lib or direct TCP/IP SDK.
 * This provider wraps ZKTeco's built-in web API (available on newer devices).
 */
export class ZKTecoProvider extends BaseProvider {
  readonly providerKey = 'zkteco';
  readonly providerType = 'attendance' as const;

  private getBaseUrl(creds: ZKTecoCredentials): string {
    const port = creds.devicePort ?? '4370';
    return `http://${creds.deviceIp}:${port}`;
  }

  async testConnection(credentials: Record<string, unknown>): Promise<TestConnectionResult> {
    const creds = credentials as unknown as ZKTecoCredentials;
    if (!creds.deviceIp) return { success: false, message: 'Device IP is required' };

    const start = Date.now();
    try {
      // ZKTeco devices expose a basic web UI — ping it to verify connectivity
      const response = await fetch(`${this.getBaseUrl(creds)}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(8000),
      });
      return {
        success: true,
        message: response.ok ? 'ZKTeco device reachable' : `Device responded with status ${response.status}`,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        message: `Cannot reach ZKTeco device at ${creds.deviceIp}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async sync(integration: IIntegration, credentials: Record<string, unknown>, _ctx: AuthContext): Promise<SyncResult> {
    const creds = credentials as unknown as ZKTecoCredentials;
    const since = integration.lastSyncAt?.toISOString() ?? new Date(0).toISOString();

    try {
      // ZKTeco web API endpoint for attendance logs
      const url = `${this.getBaseUrl(creds)}/iclock/getrequest?SN=&since=${encodeURIComponent(since)}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(integration.config.timeout),
      });

      if (!response.ok) {
        return this.errorResult([`ZKTeco API returned ${response.status}`]);
      }

      const text = await response.text();
      const records = this.parseZKTecoLogs(text);

      return this.successResult(records.length, { records });
    } catch (err) {
      return this.errorResult([err instanceof Error ? err.message : 'ZKTeco sync failed']);
    }
  }

  private parseZKTecoLogs(raw: string): Array<{ userId: string; timestamp: string; deviceId: string }> {
    // ZKTeco log format: "PIN\tDateTime\tStatus\tVerify\tWorkCode\n..."
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const parts = line.split('\t');
        return {
          userId: parts[0] ?? '',
          timestamp: parts[1] ?? '',
          deviceId: 'zkteco',
        };
      })
      .filter((r) => r.userId && r.timestamp);
  }
}
