import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  EmployeeListOptions,
  CreateEmployeeLoginPayload,
  EmployeeQrImage,
} from '@schoolos/types';

const BASE = '/employees';

export const employeeApi = {
  async create(payload: CreateEmployeePayload): Promise<Employee> {
    try {
      const res = await apiClient.post<ApiResponse<Employee>>(BASE, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async list(opts: EmployeeListOptions = {}): Promise<PaginatedResponse<Employee>> {
    try {
      const res = await apiClient.get<PaginatedResponse<Employee>>(BASE, { params: opts });
      return res.data;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getById(id: string): Promise<Employee> {
    try {
      const res = await apiClient.get<ApiResponse<Employee>>(`${BASE}/${id}`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  /** Self-service: the logged-in user's own linked Employee record, if any. */
  async getMe(): Promise<Employee> {
    try {
      const res = await apiClient.get<ApiResponse<Employee>>(`${BASE}/me`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getMyQr(): Promise<EmployeeQrImage> {
    try {
      const res = await apiClient.get<ApiResponse<EmployeeQrImage>>(`${BASE}/me/qr`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async update(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    try {
      const res = await apiClient.patch<ApiResponse<Employee>>(`${BASE}/${id}`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/${id}`);
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async uploadPhoto(id: string, file: File): Promise<Employee> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.patch<ApiResponse<Employee>>(`${BASE}/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async uploadSignature(id: string, file: File): Promise<Employee> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.patch<ApiResponse<Employee>>(`${BASE}/${id}/signature`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async createLogin(id: string, payload: CreateEmployeeLoginPayload): Promise<{ employeeId: string; username: string }> {
    try {
      const res = await apiClient.post<ApiResponse<{ employeeId: string; username: string }>>(`${BASE}/${id}/login`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async regenerateQr(id: string): Promise<Employee> {
    try {
      const res = await apiClient.post<ApiResponse<Employee>>(`${BASE}/${id}/qr/regenerate`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async disableQr(id: string): Promise<Employee> {
    try {
      const res = await apiClient.patch<ApiResponse<Employee>>(`${BASE}/${id}/qr/disable`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getQr(id: string): Promise<EmployeeQrImage> {
    try {
      const res = await apiClient.get<ApiResponse<EmployeeQrImage>>(`${BASE}/${id}/qr`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
