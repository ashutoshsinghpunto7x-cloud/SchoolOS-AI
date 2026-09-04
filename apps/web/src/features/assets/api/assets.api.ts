import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  Asset,
  CreateAssetPayload,
  UpdateAssetPayload,
  AssetListOptions,
} from '@schoolos/types';

const BASE = '/assets';

export const assetsApi = {
  async list(opts: AssetListOptions = {}): Promise<PaginatedResponse<Asset>> {
    try {
      const res = await apiClient.get<PaginatedResponse<Asset>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async underRepairCount(): Promise<number> {
    try {
      const res = await apiClient.get<ApiResponse<{ count: number }>>(`${BASE}/under-repair-count`);
      return res.data.data!.count;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async create(payload: CreateAssetPayload): Promise<Asset> {
    try {
      const res = await apiClient.post<ApiResponse<Asset>>(BASE, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async update(id: string, payload: UpdateAssetPayload): Promise<Asset> {
    try {
      const res = await apiClient.patch<ApiResponse<Asset>>(`${BASE}/${id}`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
