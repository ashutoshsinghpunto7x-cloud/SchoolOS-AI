import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mockTestApi } from '../api/mockTestApi';
import type {
  GenerateMockTestPayload, CreateMockTestPayload, UpdateMockTestPayload,
  MockTestListOptions, RejectMockTestPayload, SubmitMockTestPayload,
} from '@schoolos/types';

export const mockTestKeys = {
  all: ['mock-tests'] as const,
  chapters: (schoolId: string, cls: string, subject: string) => [...mockTestKeys.all, 'chapters', schoolId, cls, subject] as const,
  opsList: (params: MockTestListOptions) => [...mockTestKeys.all, 'ops-list', params] as const,
  opsDetail: (id: string) => [...mockTestKeys.all, 'ops-detail', id] as const,
  opsLeaderboard: (id: string) => [...mockTestKeys.all, 'ops-leaderboard', id] as const,
  pendingApprovals: () => [...mockTestKeys.all, 'pending-approvals'] as const,
  parentList: (childId: string) => [...mockTestKeys.all, 'parent-list', childId] as const,
  parentTaking: (id: string, childId: string) => [...mockTestKeys.all, 'parent-taking', id, childId] as const,
  leaderboard: (id: string) => [...mockTestKeys.all, 'leaderboard', id] as const,
};

// ── Ops authoring ────────────────────────────────────────────────────────

export const useMockTestChapters = (schoolId: string, cls: string, subject: string) =>
  useQuery({
    queryKey: mockTestKeys.chapters(schoolId, cls, subject),
    queryFn: () => mockTestApi.listChapters(schoolId, cls, subject),
    enabled: !!schoolId && !!cls && !!subject,
  });

export const useGenerateMockTest = () =>
  useMutation({ mutationFn: (payload: GenerateMockTestPayload) => mockTestApi.generate(payload) });

export const useCreateMockTest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMockTestPayload) => mockTestApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: mockTestKeys.all }),
  });
};

export const useUpdateMockTest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMockTestPayload }) => mockTestApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: mockTestKeys.all }),
  });
};

export const useSubmitMockTestForApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mockTestApi.submitForApproval(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: mockTestKeys.all }),
  });
};

export const useOpsMockTests = (params: MockTestListOptions) =>
  useQuery({
    queryKey: mockTestKeys.opsList(params),
    queryFn: () => mockTestApi.list(params),
    enabled: !!params.schoolId,
  });

export const useOpsMockTestLeaderboard = (id: string | undefined) =>
  useQuery({
    queryKey: mockTestKeys.opsLeaderboard(id ?? ''),
    queryFn: () => mockTestApi.leaderboardOps(id as string),
    enabled: !!id,
  });

// ── Principal approval ───────────────────────────────────────────────────

export const usePendingTestApprovals = () =>
  useQuery({ queryKey: mockTestKeys.pendingApprovals(), queryFn: mockTestApi.listPendingApprovals });

export const useApproveMockTest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mockTestApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: mockTestKeys.pendingApprovals() }),
  });
};

export const useRejectMockTest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: RejectMockTestPayload }) => mockTestApi.reject(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: mockTestKeys.pendingApprovals() }),
  });
};

// ── Parent / student ─────────────────────────────────────────────────────

export const useParentMockTests = (childId: string | undefined) =>
  useQuery({
    queryKey: mockTestKeys.parentList(childId ?? ''),
    queryFn: () => mockTestApi.listForParent(childId as string),
    enabled: !!childId,
    refetchInterval: 30_000, // tests can flip live/closed under the parent while the page is open
  });

export const useMockTestForTaking = (id: string | undefined, childId: string | undefined) =>
  useQuery({
    queryKey: mockTestKeys.parentTaking(id ?? '', childId ?? ''),
    queryFn: () => mockTestApi.getForTaking(id as string, childId as string),
    enabled: !!id && !!childId,
    staleTime: Infinity, // fetched once at the start of an attempt — never silently refetched mid-test
    retry: false,
  });

export const useSubmitMockTest = () =>
  useMutation({ mutationFn: ({ id, payload }: { id: string; payload: SubmitMockTestPayload }) => mockTestApi.submit(id, payload) });

export const useMockTestLeaderboard = (id: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: mockTestKeys.leaderboard(id ?? ''),
    queryFn: () => mockTestApi.leaderboard(id as string),
    enabled: !!id && enabled,
  });
