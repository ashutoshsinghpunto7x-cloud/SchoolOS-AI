import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  PayrollRecord,
  GeneratePayrollPayload,
  GenerateAllPayrollPayload,
  GenerateAllPayrollResult,
  MarkPayrollPaidPayload,
  PayrollListOptions,
  PayrollSummary,
} from '@schoolos/types';

const BASE = '/payroll';

export const payrollApi = {
  async generate(payload: GeneratePayrollPayload): Promise<PayrollRecord> {
    try {
      const res = await apiClient.post<ApiResponse<PayrollRecord>>(`${BASE}/generate`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async generateAll(payload: GenerateAllPayrollPayload): Promise<GenerateAllPayrollResult> {
    try {
      const res = await apiClient.post<ApiResponse<GenerateAllPayrollResult>>(`${BASE}/generate-all`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async list(opts: PayrollListOptions = {}): Promise<PaginatedResponse<PayrollRecord>> {
    try {
      const res = await apiClient.get<PaginatedResponse<PayrollRecord>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getSummary(month?: number, year?: number): Promise<PayrollSummary> {
    try {
      const res = await apiClient.get<ApiResponse<PayrollSummary>>(`${BASE}/summary`, { params: { month, year } });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getById(id: string): Promise<PayrollRecord> {
    try {
      const res = await apiClient.get<ApiResponse<PayrollRecord>>(`${BASE}/${id}`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  /** Self-service: the logged-in user's own payslip history, if any. */
  async listMine(): Promise<PayrollRecord[]> {
    try {
      const res = await apiClient.get<ApiResponse<PayrollRecord[]>>(`${BASE}/me`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async markPaid(id: string, payload: MarkPayrollPaidPayload): Promise<PayrollRecord> {
    try {
      const res = await apiClient.patch<ApiResponse<PayrollRecord>>(`${BASE}/${id}/mark-paid`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
