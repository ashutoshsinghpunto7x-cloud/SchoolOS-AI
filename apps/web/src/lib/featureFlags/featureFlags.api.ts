import { apiClient } from '@/services/api';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export const featureFlagsApi = {
  async evaluate(): Promise<Record<string, boolean>> {
    const res = await apiClient.get<ApiEnvelope<Record<string, boolean>>>('/feature-flags/evaluate');
    return res.data.data;
  },
};
