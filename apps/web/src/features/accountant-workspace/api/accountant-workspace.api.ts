import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  AccountantDashboardData,
  ClassDefaulterGroup,
  SendDefaultersToTeacherPayload,
  SendReceiptEmailPayload,
  StudentLedgerData,
  ClassFeeSummary,
} from '@schoolos/types';

export const accountantWorkspaceApi = {
  async getDashboard(): Promise<AccountantDashboardData> {
    try {
      const res = await apiClient.get<ApiResponse<AccountantDashboardData>>('/accountant-workspace/dashboard');
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getGroupedDefaulters(): Promise<ClassDefaulterGroup[]> {
    try {
      const res = await apiClient.get<ApiResponse<ClassDefaulterGroup[]>>('/accountant-workspace/defaulters/grouped');
      return res.data.data ?? [];
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async sendDefaultersToTeacher(payload: SendDefaultersToTeacherPayload): Promise<void> {
    try {
      await apiClient.post('/accountant-workspace/defaulters/send-to-teacher', payload);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async sendReceiptEmail(payload: SendReceiptEmailPayload): Promise<void> {
    try {
      await apiClient.post('/accountant-workspace/receipts/send-email', payload);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getStudentLedger(studentId: string): Promise<StudentLedgerData> {
    try {
      const res = await apiClient.get<ApiResponse<StudentLedgerData>>(`/accountant-workspace/student-ledger/${studentId}`);
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async getClassFeeSummary(klass: string, section: string): Promise<ClassFeeSummary> {
    try {
      const res = await apiClient.get<ApiResponse<ClassFeeSummary>>('/accountant-workspace/class-fee-summary', {
        params: { class: klass, section },
      });
      return res.data.data!;
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async sendLedgerWhatsAppReminder(studentId: string): Promise<void> {
    try {
      await apiClient.post(`/accountant-workspace/student-ledger/${studentId}/whatsapp-reminder`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },

  async sendLedgerStatementEmail(studentId: string): Promise<void> {
    try {
      await apiClient.post(`/accountant-workspace/student-ledger/${studentId}/email-statement`);
    } catch (err) {
      throw new Error(extractErrorMessage(err));
    }
  },
};
