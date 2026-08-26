import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse } from '@schoolos/types';
import type {
  VehicleView, VehicleLiveView, DriverPingResult, ParentLiveLocation,
} from '../types';

export const transportApi = {
  // ── Driver ───────────────────────────────────────────────────────────────────

  async getMyVehicle(): Promise<VehicleView | null> {
    try {
      const res = await apiClient.get<ApiResponse<VehicleView | null>>('/transport/driver/me');
      return res.data.data ?? null;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async startRoute(latitude: number, longitude: number): Promise<DriverPingResult> {
    try {
      const res = await apiClient.post<ApiResponse<DriverPingResult>>('/transport/driver/start', { latitude, longitude });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async ping(latitude: number, longitude: number): Promise<DriverPingResult> {
    try {
      const res = await apiClient.post<ApiResponse<DriverPingResult>>('/transport/driver/ping', { latitude, longitude });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async endRoute(): Promise<void> {
    try {
      await apiClient.post('/transport/driver/end');
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  // ── Parent ───────────────────────────────────────────────────────────────────

  async getParentLive(childId?: string): Promise<ParentLiveLocation> {
    try {
      const res = await apiClient.get<ApiResponse<ParentLiveLocation>>('/transport/parent/live', {
        params: childId ? { childId } : undefined,
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  // ── Admin / Principal ────────────────────────────────────────────────────────

  async listDrivers(): Promise<{ _id: string; firstName: string; lastName: string }[]> {
    try {
      const res = await apiClient.get<ApiResponse<{ _id: string; firstName: string; lastName: string }[]>>('/transport/drivers');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listVehicles(): Promise<VehicleView[]> {
    try {
      const res = await apiClient.get<ApiResponse<VehicleView[]>>('/transport/vehicles');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async createVehicle(vehicleNumber: string, routeName: string): Promise<VehicleView> {
    try {
      const res = await apiClient.post<ApiResponse<VehicleView>>('/transport/vehicles', { vehicleNumber, routeName });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async assignDriver(vehicleId: string, driverUserId: string): Promise<VehicleView> {
    try {
      const res = await apiClient.post<ApiResponse<VehicleView>>(`/transport/vehicles/${vehicleId}/assign-driver`, { driverUserId });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async assignStudents(vehicleId: string, studentIds: string[]): Promise<{ studentIds: string[] }> {
    try {
      const res = await apiClient.post<ApiResponse<{ studentIds: string[] }>>(`/transport/vehicles/${vehicleId}/assign-students`, { studentIds });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listVehicleStudents(vehicleId: string): Promise<string[]> {
    try {
      const res = await apiClient.get<ApiResponse<string[]>>(`/transport/vehicles/${vehicleId}/students`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async listAllLive(): Promise<VehicleLiveView[]> {
    try {
      const res = await apiClient.get<ApiResponse<VehicleLiveView[]>>('/transport/live');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
