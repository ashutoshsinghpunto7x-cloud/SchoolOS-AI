import type { ApiResponse, SchoolEvent, UpcomingEventsOptions } from '@schoolos/types';
import { apiClient } from '@/services/api/client';

export const eventsApi = {
  async getUpcoming(options: UpcomingEventsOptions = {}): Promise<SchoolEvent[]> {
    const res = await apiClient.get<ApiResponse<SchoolEvent[]>>('/events/upcoming', { params: options });
    return res.data.data ?? [];
  },
};
