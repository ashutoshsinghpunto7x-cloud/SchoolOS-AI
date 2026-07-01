import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  CreateUserPayload,
  UpdateUserPayload,
  ChangeStatusPayload,
  UsersQueryOptions,
  RoleMeta,
  PermissionMeta,
} from '@schoolos/types';

export const usersApi = {
  async list(options: UsersQueryOptions = {}): Promise<PaginatedResponse<User>> {
    try {
      const params = new URLSearchParams();
      if (options.page) params.set('page', String(options.page));
      if (options.limit) params.set('limit', String(options.limit));
      if (options.search) params.set('search', options.search);
      if (options.role) params.set('role', options.role);
      if (options.status) params.set('status', options.status);
      const query = params.toString();
      const res = await apiClient.get<PaginatedResponse<User>>(
        `/users${query ? `?${query}` : ''}`
      );
      return res.data;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getById(id: string): Promise<User> {
    try {
      const res = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async create(payload: CreateUserPayload): Promise<User> {
    try {
      const res = await apiClient.post<ApiResponse<User>>('/users', payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async update(id: string, payload: UpdateUserPayload): Promise<User> {
    try {
      const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}`, payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async changeStatus(id: string, payload: ChangeStatusPayload): Promise<User> {
    try {
      const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}/status`, payload);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete(`/users/${id}`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getRoles(): Promise<RoleMeta[]> {
    try {
      const res = await apiClient.get<ApiResponse<RoleMeta[]>>('/users/roles');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getPermissions(): Promise<PermissionMeta[]> {
    try {
      const res = await apiClient.get<ApiResponse<PermissionMeta[]>>('/users/permissions');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
