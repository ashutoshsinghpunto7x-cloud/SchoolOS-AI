import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse, FeeStructureEntry, UpsertFeeStructurePayload, ApplyAllClassesFeeStructurePayload,
  FeeDiscountRequest, CreateDiscountRequestPayload, ReviewDiscountRequestPayload,
} from '@schoolos/types';

const BASE = '/fee-structure';

export const feeStructureApi = {
  async list(academicYear?: string): Promise<FeeStructureEntry[]> {
    try {
      const res = await apiClient.get<ApiResponse<FeeStructureEntry[]>>(BASE, { params: academicYear ? { academicYear } : {} });
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async upsert(payload: UpsertFeeStructurePayload): Promise<FeeStructureEntry> {
    try {
      const res = await apiClient.post<ApiResponse<FeeStructureEntry>>(BASE, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getTemplate(academicYear: string): Promise<FeeStructureEntry[]> {
    try {
      const res = await apiClient.get<ApiResponse<FeeStructureEntry[]>>(`${BASE}/template`, { params: { academicYear } });
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async applyToAllClasses(payload: ApplyAllClassesFeeStructurePayload): Promise<{ classesUpdated: number }> {
    try {
      const res = await apiClient.post<ApiResponse<{ classesUpdated: number }>>(`${BASE}/apply-all`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async listPendingDiscounts(): Promise<FeeDiscountRequest[]> {
    try {
      const res = await apiClient.get<ApiResponse<FeeDiscountRequest[]>>(`${BASE}/discounts/pending`);
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async listStudentDiscounts(studentId: string): Promise<FeeDiscountRequest[]> {
    try {
      const res = await apiClient.get<ApiResponse<FeeDiscountRequest[]>>(`${BASE}/discounts/student/${studentId}`);
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async createDiscountRequest(payload: CreateDiscountRequestPayload): Promise<FeeDiscountRequest> {
    try {
      const res = await apiClient.post<ApiResponse<FeeDiscountRequest>>(`${BASE}/discounts`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async approveDiscountRequest(id: string, payload: ReviewDiscountRequestPayload = {}): Promise<FeeDiscountRequest> {
    try {
      const res = await apiClient.patch<ApiResponse<FeeDiscountRequest>>(`${BASE}/discounts/${id}/approve`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async rejectDiscountRequest(id: string, payload: ReviewDiscountRequestPayload = {}): Promise<FeeDiscountRequest> {
    try {
      const res = await apiClient.patch<ApiResponse<FeeDiscountRequest>>(`${BASE}/discounts/${id}/reject`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
