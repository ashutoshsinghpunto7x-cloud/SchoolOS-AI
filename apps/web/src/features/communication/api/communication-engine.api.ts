import { apiClient, extractErrorMessage } from '@/services/api';
import type { ApiResponse } from '@schoolos/types';

export interface BulkSendSummary {
  jobId: string | null;
  totalStudents: number;
  sent: number;
  failed: number;
  skipped: number;
  status: 'PROCESSING' | 'COMPLETED';
}

export interface BulkSendJob {
  _id: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRecipients: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface AttendanceSendStatus {
  alreadySent: boolean;
  jobId: string | null;
  status: 'PROCESSING' | 'COMPLETED' | null;
  sent: number;
  failed: number;
  skipped: number;
}

const handle = async <T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> => {
  try {
    const res = await promise;
    return res.data.data!;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
};

/** Client for the real Meta WhatsApp Cloud API-backed notification engine
 *  (`/communication/*`) — distinct from the legacy `/communications/*` module
 *  in `communication.api.ts`. */
export const communicationEngineApi = {
  sendAttendanceNotifications: (params: { date?: string; class?: string; section?: string }) =>
    handle<BulkSendSummary>(apiClient.post('/communication/attendance/send', params)),
  getAttendanceSendStatus: (params: { date?: string; class?: string; section?: string }) =>
    handle<AttendanceSendStatus>(apiClient.get('/communication/attendance/send-status', { params })),
  getJob: (jobId: string) => handle<BulkSendJob>(apiClient.get(`/communication/jobs/${jobId}`)),
};
