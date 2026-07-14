import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  SalaryRecord,
  SalarySummary,
  CreateSalaryRecordPayload,
  UpdateSalaryRecordPayload,
  MarkSalaryPaidPayload,
  SalaryListOptions,
} from '@schoolos/types';

const BASE = '/salary';

export const salaryApi = {
  async create(payload: CreateSalaryRecordPayload): Promise<SalaryRecord> {
    try {
      const res = await apiClient.post<ApiResponse<SalaryRecord>>(BASE, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async bulkCreate(records: CreateSalaryRecordPayload[]): Promise<SalaryRecord[]> {
    try {
      const res = await apiClient.post<ApiResponse<SalaryRecord[]>>(`${BASE}/bulk`, { records });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async list(opts: SalaryListOptions = {}): Promise<PaginatedResponse<SalaryRecord>> {
    try {
      const res = await apiClient.get<PaginatedResponse<SalaryRecord>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getSummary(month?: string, year?: number): Promise<SalarySummary> {
    try {
      const res = await apiClient.get<ApiResponse<SalarySummary>>(`${BASE}/summary`, { params: { month, year } });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getById(id: string): Promise<SalaryRecord> {
    try {
      const res = await apiClient.get<ApiResponse<SalaryRecord>>(`${BASE}/${id}`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async update(id: string, payload: UpdateSalaryRecordPayload): Promise<SalaryRecord> {
    try {
      const res = await apiClient.patch<ApiResponse<SalaryRecord>>(`${BASE}/${id}`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async markPaid(id: string, payload: MarkSalaryPaidPayload): Promise<SalaryRecord> {
    try {
      const res = await apiClient.patch<ApiResponse<SalaryRecord>>(`${BASE}/${id}/mark-paid`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async forcePending(id: string): Promise<SalaryRecord> {
    try {
      const res = await apiClient.patch<ApiResponse<SalaryRecord>>(`${BASE}/${id}/force-pending`, {});
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
