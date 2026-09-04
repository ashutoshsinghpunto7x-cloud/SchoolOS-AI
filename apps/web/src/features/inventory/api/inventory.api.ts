import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  InventoryItem,
  CreateInventoryItemPayload,
  UpdateInventoryItemPayload,
  InventoryItemListOptions,
  StockMovement,
  CreateStockMovementPayload,
} from '@schoolos/types';

const BASE = '/inventory';

export const inventoryApi = {
  async list(opts: InventoryItemListOptions = {}): Promise<PaginatedResponse<InventoryItem>> {
    try {
      const res = await apiClient.get<PaginatedResponse<InventoryItem>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async lowStockCount(): Promise<number> {
    try {
      const res = await apiClient.get<ApiResponse<{ count: number }>>(`${BASE}/low-stock-count`);
      return res.data.data!.count;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async create(payload: CreateInventoryItemPayload): Promise<InventoryItem> {
    try {
      const res = await apiClient.post<ApiResponse<InventoryItem>>(BASE, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async update(id: string, payload: UpdateInventoryItemPayload): Promise<InventoryItem> {
    try {
      const res = await apiClient.patch<ApiResponse<InventoryItem>>(`${BASE}/${id}`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async listMovements(id: string): Promise<StockMovement[]> {
    try {
      const res = await apiClient.get<ApiResponse<StockMovement[]>>(`${BASE}/${id}/movements`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async createMovement(id: string, payload: CreateStockMovementPayload): Promise<StockMovement> {
    try {
      const res = await apiClient.post<ApiResponse<StockMovement>>(`${BASE}/${id}/movements`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
