import { apiClient, extractErrorMessage } from '@/services/api';
import type { PaginatedResponse } from '@schoolos/types';

export interface AuditLogEntry {
  _id: string;
  userId: string;
  userDisplayName: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface AuditListOptions {
  resource?: string;
  resourceId?: string;
  page?: number;
  limit?: number;
}

export const auditApi = {
  async list(opts: AuditListOptions = {}): Promise<PaginatedResponse<AuditLogEntry>> {
    try {
      const res = await apiClient.get<PaginatedResponse<AuditLogEntry>>('/audit', { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
