import { apiClient } from './api';

export interface HealthResponse {
  success: boolean;
  message: string;
  meta: {
    environment: string;
    database: string;
    uptime: number;
    timestamp: string;
  };
}

export const fetchHealth = async (): Promise<HealthResponse> => {
  const { data } = await apiClient.get<HealthResponse>('/health');
  return data;
};
