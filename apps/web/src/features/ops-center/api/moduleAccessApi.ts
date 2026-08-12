import { apiClient } from '@/services/api';

export interface ModuleAccessRow {
  key: string;
  label: string;
  restricted: boolean;
  message?: string;
  returnAt?: string;
  showReturnTime: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

/** Minimal payload every authenticated tab polls — restricted modules only. */
export type ModuleRestrictedStatus = Record<
  string,
  { message?: string; returnAt?: string; showReturnTime: boolean }
>;

export interface BulkSetModuleAccessInput {
  moduleKeys: string[];
  restricted: boolean;
  message?: string;
  returnAt?: string | null;
  showReturnTime?: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export const moduleAccessApi = {
  async list(): Promise<ModuleAccessRow[]> {
    const res = await apiClient.get<ApiEnvelope<ModuleAccessRow[]>>('/ops/module-access');
    return res.data.data;
  },

  async bulkSet(input: BulkSetModuleAccessInput): Promise<void> {
    await apiClient.post('/ops/module-access/bulk', input);
  },

  /** Authenticated (any role) — no Ops permission required. */
  async getStatus(): Promise<ModuleRestrictedStatus> {
    const res = await apiClient.get<ApiEnvelope<ModuleRestrictedStatus>>('/module-access/status');
    return res.data.data;
  },
};
