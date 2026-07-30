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
};
