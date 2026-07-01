import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  AutomationJob,
  AutomationJobsQueryOptions,
} from '@schoolos/types';

const handle = async <T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> => {
  try {
    const res = await promise;
    return res.data.data!;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
};

export const automationApi = {
  async list(opts: AutomationJobsQueryOptions = {}): Promise<PaginatedResponse<AutomationJob>> {
    try {
      const params = new URLSearchParams();
      if (opts.page) params.set('page', String(opts.page));
      if (opts.limit) params.set('limit', String(opts.limit));
      if (opts.search) params.set('search', opts.search);
      if (opts.type) params.set('type', opts.type);
      if (opts.status) params.set('status', opts.status);
      if (opts.sortOrder) params.set('sortOrder', opts.sortOrder);
      const query = params.toString();
      const res = await apiClient.get<PaginatedResponse<AutomationJob>>(
        `/automation/jobs${query ? `?${query}` : ''}`
      );
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  getById: (id: string) =>
    handle(apiClient.get<ApiResponse<AutomationJob>>(`/automation/jobs/${id}`)),

  cancel: (id: string) =>
    handle(apiClient.patch<ApiResponse<AutomationJob>>(`/automation/jobs/${id}/cancel`, {})),

  retry: (id: string) =>
    handle(apiClient.post<ApiResponse<AutomationJob>>(`/automation/jobs/${id}/retry`, {})),
};
