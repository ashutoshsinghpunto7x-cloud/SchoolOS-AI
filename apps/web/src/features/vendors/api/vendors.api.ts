import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  Vendor,
  VendorProfile,
  VendorLedgerData,
  VendorBill,
  VendorPayment,
  CreateVendorPayload,
  UpdateVendorPayload,
  VendorListOptions,
  CreateVendorBillPayload,
  RecordVendorPaymentPayload,
} from '@schoolos/types';

const BASE = '/vendors';

export const vendorsApi = {
  async list(opts: VendorListOptions = {}): Promise<PaginatedResponse<Vendor>> {
    try {
      const res = await apiClient.get<PaginatedResponse<Vendor>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async create(payload: CreateVendorPayload): Promise<Vendor> {
    try {
      const res = await apiClient.post<ApiResponse<Vendor>>(BASE, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getProfile(id: string): Promise<VendorProfile> {
    try {
      const res = await apiClient.get<ApiResponse<VendorProfile>>(`${BASE}/${id}`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async update(id: string, payload: UpdateVendorPayload): Promise<Vendor> {
    try {
      const res = await apiClient.patch<ApiResponse<Vendor>>(`${BASE}/${id}`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getLedger(id: string): Promise<VendorLedgerData> {
    try {
      const res = await apiClient.get<ApiResponse<VendorLedgerData>>(`${BASE}/${id}/ledger`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async listBills(id: string): Promise<PaginatedResponse<VendorBill>> {
    try {
      const res = await apiClient.get<PaginatedResponse<VendorBill>>(`${BASE}/${id}/bills`, { params: { limit: 100 } });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async createBill(id: string, payload: CreateVendorBillPayload): Promise<VendorBill> {
    try {
      const res = await apiClient.post<ApiResponse<VendorBill>>(`${BASE}/${id}/bills`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async recordPayment(
    id: string,
    payload: RecordVendorPaymentPayload,
  ): Promise<{ payment: VendorPayment; bill?: VendorBill }> {
    try {
      const res = await apiClient.post<ApiResponse<{ payment: VendorPayment; bill?: VendorBill }>>(`${BASE}/${id}/payments`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getOverdueBills(): Promise<VendorBill[]> {
    try {
      const res = await apiClient.get<ApiResponse<VendorBill[]>>(`${BASE}/bills/overdue`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
