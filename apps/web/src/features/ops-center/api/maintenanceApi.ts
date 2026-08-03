import { apiClient } from '@/services/api';

export interface MaintenanceState {
  _id: string;
  manualActive: boolean;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  message: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceStatus {
  isActive: boolean;
  reason: 'manual' | 'scheduled' | null;
  message: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  manualActive: boolean;
}

export interface ScheduleMaintenanceInput {
  startAt: string;
  endAt: string;
  message: string;
}

export interface ToggleMaintenanceInput {
  isActive: boolean;
  message?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export const maintenanceApi = {
  async getState(): Promise<MaintenanceState | null> {
    const res = await apiClient.get<ApiEnvelope<MaintenanceState | null>>('/ops/maintenance');
    return res.data.data;
  },

  async schedule(input: ScheduleMaintenanceInput): Promise<MaintenanceState> {
    const res = await apiClient.post<ApiEnvelope<MaintenanceState>>('/ops/maintenance/schedule', input);
    return res.data.data;
  },

  async cancelSchedule(): Promise<MaintenanceState> {
    const res = await apiClient.delete<ApiEnvelope<MaintenanceState>>('/ops/maintenance/schedule');
    return res.data.data;
  },

  async toggle(input: ToggleMaintenanceInput): Promise<MaintenanceState> {
    const res = await apiClient.post<ApiEnvelope<MaintenanceState>>('/ops/maintenance/toggle', input);
    return res.data.data;
  },

  /** Public — no auth required, safe to call before/without a session. */
  async getStatus(): Promise<MaintenanceStatus> {
    const res = await apiClient.get<ApiEnvelope<MaintenanceStatus>>('/maintenance/status');
    return res.data.data;
  },
};
