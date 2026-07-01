import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  ExpenseRecord,
  ExpenseSummary,
  CreateExpenseRecordPayload,
  UpdateExpenseRecordPayload,
  ExpenseListOptions,
} from '@schoolos/types';

const BASE = '/expenses';

export const expenseApi = {
  async create(payload: CreateExpenseRecordPayload): Promise<ExpenseRecord> {
    try {
      const res = await apiClient.post<ApiResponse<ExpenseRecord>>(BASE, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async list(opts: ExpenseListOptions = {}): Promise<PaginatedResponse<ExpenseRecord>> {
    try {
      const res = await apiClient.get<PaginatedResponse<ExpenseRecord>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getSummary(dateFrom?: string, dateTo?: string): Promise<ExpenseSummary> {
    try {
      const res = await apiClient.get<ApiResponse<ExpenseSummary>>(`${BASE}/summary`, { params: { dateFrom, dateTo } });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getById(id: string): Promise<ExpenseRecord> {
    try {
      const res = await apiClient.get<ApiResponse<ExpenseRecord>>(`${BASE}/${id}`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async update(id: string, payload: UpdateExpenseRecordPayload): Promise<ExpenseRecord> {
    try {
      const res = await apiClient.patch<ApiResponse<ExpenseRecord>>(`${BASE}/${id}`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
