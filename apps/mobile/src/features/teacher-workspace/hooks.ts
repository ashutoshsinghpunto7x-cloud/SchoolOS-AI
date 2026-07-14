import { useQuery } from '@tanstack/react-query';
import { teacherWorkspaceApi } from './api';

export function useMyWorkspace() {
  return useQuery({
    queryKey: ['teacher-workspace', 'me'],
    queryFn: teacherWorkspaceApi.getMe,
  });
}
