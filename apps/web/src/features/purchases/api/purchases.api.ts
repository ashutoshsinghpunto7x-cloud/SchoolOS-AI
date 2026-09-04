import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  PurchaseRequest,
  PurchaseOrder,
  CreatePurchaseRequestPayload,
  PurchaseRequestListOptions,
  CreatePurchaseOrderPayload,
  ReceivePurchaseOrderPayload,
  PurchaseOrderListOptions,
} from '@schoolos/types';

export const purchasesApi = {
  // Purchase Requests
  async listRequests(opts: PurchaseRequestListOptions = {}): Promise<PaginatedResponse<PurchaseRequest>> {
    try {
      const res = await apiClient.get<PaginatedResponse<PurchaseRequest>>('/purchase-requests', { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getRequest(id: string): Promise<PurchaseRequest> {
    try {
      const res = await apiClient.get<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async pendingRequestCount(): Promise<number> {
    try {
      const res = await apiClient.get<ApiResponse<{ count: number }>>('/purchase-requests/pending-count');
      return res.data.data!.count;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async createRequest(payload: CreatePurchaseRequestPayload): Promise<PurchaseRequest> {
    try {
      const res = await apiClient.post<ApiResponse<PurchaseRequest>>('/purchase-requests', payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async approveRequest(id: string): Promise<PurchaseRequest> {
    try {
      const res = await apiClient.put<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}/approve`, {});
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async rejectRequest(id: string, rejectionReason?: string): Promise<PurchaseRequest> {
    try {
      const res = await apiClient.put<ApiResponse<PurchaseRequest>>(`/purchase-requests/${id}/reject`, { rejectionReason });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  // Purchase Orders
  async listOrders(opts: PurchaseOrderListOptions = {}): Promise<PaginatedResponse<PurchaseOrder>> {
    try {
      const res = await apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders', { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getOrder(id: string): Promise<PurchaseOrder> {
    try {
      const res = await apiClient.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async createOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
    try {
      const res = await apiClient.post<ApiResponse<PurchaseOrder>>('/purchase-orders', payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async receiveOrder(id: string, payload: ReceivePurchaseOrderPayload = {}): Promise<PurchaseOrder> {
    try {
      const res = await apiClient.put<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/receive`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
