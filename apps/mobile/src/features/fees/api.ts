import type {
  ApiResponse,
  FeeCollectionSummary,
  FeeDefaulter,
  FeeListOptions,
  FeeRecordWithPayments,
  OutstandingOptions,
  PaginatedResponse,
  FeeRecord,
  ReceiptLookupResult,
  RecordPaymentPayload,
  RecordPaymentResult,
} from '@schoolos/types';
import { apiClient } from '@/services/api/client';

export const feesApi = {
  async getSummary(academicYear?: string): Promise<FeeCollectionSummary> {
    const res = await apiClient.get<ApiResponse<FeeCollectionSummary>>('/fees/summary', {
      params: academicYear ? { academicYear } : undefined,
    });
    if (!res.data.data) throw new Error('Fee summary response missing data');
    return res.data.data;
  },

  async getOutstanding(options: OutstandingOptions = {}): Promise<FeeDefaulter[]> {
    const res = await apiClient.get<ApiResponse<FeeDefaulter[]>>('/fees/outstanding', { params: options });
    return res.data.data ?? [];
  },

  async getStudentFees(studentId: string): Promise<FeeRecordWithPayments[]> {
    const res = await apiClient.get<ApiResponse<FeeRecordWithPayments[]>>(`/fees/student/${studentId}`);
    return res.data.data ?? [];
  },

  async list(options: FeeListOptions = {}): Promise<PaginatedResponse<FeeRecord>> {
    const res = await apiClient.get<PaginatedResponse<FeeRecord>>('/fees', { params: options });
    return res.data;
  },

  async recordPayment(payload: RecordPaymentPayload): Promise<RecordPaymentResult> {
    const res = await apiClient.post<ApiResponse<RecordPaymentResult>>('/fees/payment', payload);
    if (!res.data.data) throw new Error('Record payment response missing data');
    return res.data.data;
  },

  async getReceiptByNumber(receiptNumber: string): Promise<ReceiptLookupResult> {
    const res = await apiClient.get<ApiResponse<ReceiptLookupResult>>(
      `/fees/payments/receipt/${encodeURIComponent(receiptNumber)}`
    );
    if (!res.data.data) throw new Error('Receipt response missing data');
    return res.data.data;
  },
};
