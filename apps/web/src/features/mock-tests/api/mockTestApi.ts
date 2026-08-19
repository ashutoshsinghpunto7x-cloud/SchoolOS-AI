import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  MockTest,
  GenerateMockTestPayload,
  GenerateMockTestResult,
  CreateMockTestPayload,
  UpdateMockTestPayload,
  MockTestListOptions,
  RejectMockTestPayload,
  SyllabusChapter,
  ParentMockTestSummary,
  MockTestQuestionForTaking,
  SubmitMockTestPayload,
  SubmitMockTestResult,
  MockTestLeaderboardEntry,
} from '@schoolos/types';

// Shared across the three consuming surfaces (Ops Center authoring, Principal
// approvals, Parent test-taking) — one client instead of duplicating fetch
// wiring per-role, same reasoning as other cross-cutting api modules in this repo.

export const mockTestApi = {
  // ── Ops authoring ──────────────────────────────────────────────────────
  async listChapters(schoolId: string, cls: string, subject: string): Promise<SyllabusChapter[]> {
    try {
      const res = await apiClient.get<ApiResponse<SyllabusChapter[]>>('/mock-tests/chapters', { params: { schoolId, class: cls, subject } });
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async generate(payload: GenerateMockTestPayload): Promise<GenerateMockTestResult> {
    try {
      const res = await apiClient.post<ApiResponse<GenerateMockTestResult>>('/mock-tests/generate', payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async create(payload: CreateMockTestPayload): Promise<MockTest> {
    try {
      const res = await apiClient.post<ApiResponse<MockTest>>('/mock-tests', payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async update(id: string, payload: UpdateMockTestPayload): Promise<MockTest> {
    try {
      const res = await apiClient.patch<ApiResponse<MockTest>>(`/mock-tests/${id}`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async submitForApproval(id: string): Promise<MockTest> {
    try {
      const res = await apiClient.post<ApiResponse<MockTest>>(`/mock-tests/${id}/submit-for-approval`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async list(params: MockTestListOptions): Promise<MockTest[]> {
    try {
      const res = await apiClient.get<ApiResponse<MockTest[]>>('/mock-tests', { params });
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getById(id: string): Promise<MockTest> {
    try {
      const res = await apiClient.get<ApiResponse<MockTest>>(`/mock-tests/${id}`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async leaderboardOps(id: string): Promise<MockTestLeaderboardEntry[]> {
    try {
      const res = await apiClient.get<ApiResponse<MockTestLeaderboardEntry[]>>(`/mock-tests/${id}/leaderboard`);
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  // ── Principal approval ─────────────────────────────────────────────────
  async listPendingApprovals(): Promise<MockTest[]> {
    try {
      const res = await apiClient.get<ApiResponse<MockTest[]>>('/mock-tests/approvals/pending');
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async approve(id: string): Promise<MockTest> {
    try {
      const res = await apiClient.patch<ApiResponse<MockTest>>(`/mock-tests/approvals/${id}/approve`);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async reject(id: string, payload?: RejectMockTestPayload): Promise<MockTest> {
    try {
      const res = await apiClient.patch<ApiResponse<MockTest>>(`/mock-tests/approvals/${id}/reject`, payload ?? {});
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  // ── Parent / student ───────────────────────────────────────────────────
  async listForParent(childId: string): Promise<ParentMockTestSummary[]> {
    try {
      const res = await apiClient.get<ApiResponse<ParentMockTestSummary[]>>('/mock-tests/parent', { params: { childId } });
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async getForTaking(id: string, childId: string): Promise<{ test: ParentMockTestSummary; questions: MockTestQuestionForTaking[] }> {
    try {
      const res = await apiClient.get<ApiResponse<{ test: ParentMockTestSummary; questions: MockTestQuestionForTaking[] }>>(`/mock-tests/parent/${id}/take`, { params: { childId } });
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async submit(id: string, payload: SubmitMockTestPayload): Promise<SubmitMockTestResult> {
    try {
      const res = await apiClient.post<ApiResponse<SubmitMockTestResult>>(`/mock-tests/parent/${id}/submit`, payload);
      return res.data.data!;
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },

  async leaderboard(id: string): Promise<MockTestLeaderboardEntry[]> {
    try {
      const res = await apiClient.get<ApiResponse<MockTestLeaderboardEntry[]>>(`/mock-tests/parent/${id}/leaderboard`);
      return res.data.data ?? [];
    } catch (err) { throw new Error(extractErrorMessage(err)); }
  },
};
