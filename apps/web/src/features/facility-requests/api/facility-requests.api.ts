import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  FacilityRequest,
  CreateFacilityRequestPayload,
  AssignFacilityRequestPayload,
  UpdateFacilityRequestStatusPayload,
  FacilityRequestListOptions,
  FacilityRequestSlaReport,
} from '@schoolos/types';

const BASE = '/facility-requests';

export const facilityRequestsApi = {
  async list(opts: FacilityRequestListOptions = {}): Promise<PaginatedResponse<FacilityRequest>> {
    try {
      const res = await apiClient.get<PaginatedResponse<FacilityRequest>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async openCount(): Promise<number> {
    try {
      const res = await apiClient.get<ApiResponse<{ count: number }>>(`${BASE}/open-count`);
      return res.data.data!.count;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async slaReport(): Promise<FacilityRequestSlaReport> {
    try {
      const res = await apiClient.get<ApiResponse<FacilityRequestSlaReport>>(`${BASE}/sla-report`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async create(payload: CreateFacilityRequestPayload): Promise<FacilityRequest> {
    try {
      const res = await apiClient.post<ApiResponse<FacilityRequest>>(BASE, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async assign(id: string, payload: AssignFacilityRequestPayload): Promise<FacilityRequest> {
    try {
      const res = await apiClient.put<ApiResponse<FacilityRequest>>(`${BASE}/${id}/assign`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async updateStatus(id: string, payload: UpdateFacilityRequestStatusPayload): Promise<FacilityRequest> {
    try {
      const res = await apiClient.put<ApiResponse<FacilityRequest>>(`${BASE}/${id}/status`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
