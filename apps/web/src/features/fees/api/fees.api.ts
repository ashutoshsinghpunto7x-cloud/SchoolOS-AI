import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  FeeRecord,
  FeeRecordWithPayments,
  FeeCollectionSummary,
  CreateFeeRecordPayload,
  UpdateFeeRecordPayload,
  RecordPaymentPayload,
  RecordPaymentResult,
  RecordBulkPaymentPayload,
  RecordBulkPaymentResult,
  ReceiptLookupResult,
  FeeListOptions,
  OutstandingOptions,
  PaginatedResponse,
} from '@schoolos/types';

const BASE = '/fees';

export const feesApi = {
  create: async (payload: CreateFeeRecordPayload): Promise<FeeRecord> => {
    try {
      const res = await apiClient.post<{ data: FeeRecord }>(BASE, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  list: async (opts: FeeListOptions = {}): Promise<PaginatedResponse<FeeRecord>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<FeeRecord>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getById: async (id: string): Promise<FeeRecordWithPayments> => {
    try {
      const res = await apiClient.get<{ data: FeeRecordWithPayments }>(`${BASE}/${id}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  update: async (id: string, payload: UpdateFeeRecordPayload): Promise<FeeRecord> => {
    try {
      const res = await apiClient.patch<{ data: FeeRecord }>(`${BASE}/${id}`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  recordPayment: async (payload: RecordPaymentPayload): Promise<RecordPaymentResult> => {
    try {
      const res = await apiClient.post<{ data: RecordPaymentResult }>(`${BASE}/payment`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  recordBulkPayment: async (payload: RecordBulkPaymentPayload): Promise<RecordBulkPaymentResult> => {
    try {
      const res = await apiClient.post<{ data: RecordBulkPaymentResult }>(`${BASE}/payment/bulk`, payload);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getPaymentByReceipt: async (receiptNumber: string): Promise<ReceiptLookupResult> => {
    try {
      const res = await apiClient.get<{ data: ReceiptLookupResult }>(`${BASE}/payments/receipt/${encodeURIComponent(receiptNumber)}`);
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getOutstanding: async (opts: OutstandingOptions = {}): Promise<PaginatedResponse<FeeRecord>> => {
    try {
      const res = await apiClient.get<PaginatedResponse<FeeRecord>>(`${BASE}/outstanding`, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getSummary: async (academicYear?: string): Promise<FeeCollectionSummary> => {
    try {
      const res = await apiClient.get<{ data: FeeCollectionSummary }>(`${BASE}/summary`, {
        params: academicYear ? { academicYear } : {},
      });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  getStudentFees: async (studentId: string, opts: { academicYear?: string; status?: string } = {}): Promise<FeeRecord[]> => {
    try {
      const res = await apiClient.get<{ data: FeeRecord[] }>(`${BASE}/student/${studentId}`, { params: opts });
      return res.data.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
