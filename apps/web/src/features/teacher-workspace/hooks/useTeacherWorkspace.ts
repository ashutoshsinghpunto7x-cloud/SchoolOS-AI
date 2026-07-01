import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherWorkspaceApi } from '../api/teacher-workspace.api';
import type { UpsertOwnTimetableEntryPayload, RemoveOwnTimetableEntryPayload } from '@schoolos/types';

export const teacherWorkspaceKeys = {
  me: ['teacher-workspace', 'me'] as const,
};

export const useTeacherWorkspace = () =>
  useQuery({
    queryKey: teacherWorkspaceKeys.me,
    queryFn:  teacherWorkspaceApi.getMe,
    staleTime: 30_000, // refresh every 30s so attendance status stays current
  });

export const useInvalidateTeacherWorkspace = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: teacherWorkspaceKeys.me });
};

export const useUpsertOwnTimetableEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertOwnTimetableEntryPayload) => teacherWorkspaceApi.upsertTimetableEntry(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: teacherWorkspaceKeys.me }),
  });
};

export const useRemoveOwnTimetableEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RemoveOwnTimetableEntryPayload) => teacherWorkspaceApi.removeTimetableEntry(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: teacherWorkspaceKeys.me }),
  });
};
