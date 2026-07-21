import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  ScanQrPayload,
  ManualMarkPayload,
  StaffAttendanceScanResult,
  StaffAttendanceRecord,
} from '@schoolos/types';

const BASE = '/attendance-qr';

export const staffAttendanceApi = {
  async scan(payload: ScanQrPayload): Promise<StaffAttendanceScanResult> {
    try {
      const res = await apiClient.post<ApiResponse<StaffAttendanceScanResult>>(`${BASE}/scan`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async markManual(payload: ManualMarkPayload): Promise<StaffAttendanceScanResult> {
    try {
      const res = await apiClient.post<ApiResponse<StaffAttendanceScanResult>>(`${BASE}/manual`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async today(): Promise<StaffAttendanceRecord[]> {
    try {
      const res = await apiClient.get<ApiResponse<StaffAttendanceRecord[]>>(`${BASE}/today`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async forEmployee(employeeId: string, opts: { from?: string; to?: string } = {}): Promise<StaffAttendanceRecord[]> {
    try {
      const res = await apiClient.get<ApiResponse<StaffAttendanceRecord[]>>(`${BASE}/employee/${employeeId}`, { params: opts });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
