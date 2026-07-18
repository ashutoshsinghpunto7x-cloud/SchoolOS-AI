import type { ApiResponse, CreateStudentPayload, Student } from '@schoolos/types';
import { apiClient } from '@/services/api/client';

// Minimal — just enough to back the Reception "New Admission" action. A full
// Students module (directory/search/profile) is a separate, larger piece of
// work and out of scope here.
export const studentsApi = {
  async create(payload: CreateStudentPayload): Promise<Student> {
    const res = await apiClient.post<ApiResponse<Student>>('/students', payload);
    if (!res.data.data) throw new Error('Create student response missing data');
    return res.data.data;
  },
};
