import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  Communication,
  CommunicationsQueryOptions,
  UpdateCommunicationPayload,
} from '@schoolos/types';

const handle = async <T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> => {
  try {
    const res = await promise;
    return res.data.data!;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
};

export const communicationApi = {
  list: async (opts: CommunicationsQueryOptions = {}): Promise<PaginatedResponse<Communication>> => {
    try {
      const params = new URLSearchParams();
      if (opts.page) params.set('page', String(opts.page));
      if (opts.limit) params.set('limit', String(opts.limit));
      if (opts.search) params.set('search', opts.search);
      if (opts.type) params.set('type', opts.type);
      if (opts.status) params.set('status', opts.status);
      if (opts.sortOrder) params.set('sortOrder', opts.sortOrder);
      const query = params.toString();
      const res = await apiClient.get<PaginatedResponse<Communication>>(
        `/communications${query ? `?${query}` : ''}`
      );
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  listByStudent: (studentId: string) =>
    handle(apiClient.get<ApiResponse<Communication[]>>(`/communications/student/${studentId}`))
      .then((data) => data ?? ([] as Communication[])),

  getById: (id: string) =>
    handle(apiClient.get<ApiResponse<Communication>>(`/communications/${id}`)),

  update: (id: string, payload: UpdateCommunicationPayload) =>
    handle(apiClient.patch<ApiResponse<Communication>>(`/communications/${id}`, payload)),

  initiateCall: (studentId: string) =>
    handle(apiClient.post<ApiResponse<Communication>>('/communications/call', { studentId })),

  createNote: (studentId: string, note: string) =>
    handle(apiClient.post<ApiResponse<Communication>>('/communications/note', { studentId, note })),

  sendWhatsApp: (studentId: string, message: string) =>
    handle(
      apiClient.post<ApiResponse<Communication>>('/communications/whatsapp', { studentId, message })
    ),
};
