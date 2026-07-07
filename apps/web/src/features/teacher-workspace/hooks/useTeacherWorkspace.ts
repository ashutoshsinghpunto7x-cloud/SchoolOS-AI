import { useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherWorkspaceApi } from '../api/teacher-workspace.api';

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
