import { useQuery } from '@tanstack/react-query';
import { parentWorkspaceApi } from './api';

// `childId` is undefined only on first render before the workspace bundle
// has told us which child is selected — `enabled` gates the sub-resource
// queries until a real id is available, matching the backend's requirement
// that academics/attendance/fees always be scoped to one child.

export function useParentWorkspace(childId?: string) {
  return useQuery({
    queryKey: ['parent-workspace', 'workspace', childId ?? null],
    queryFn: () => parentWorkspaceApi.getWorkspace(childId),
  });
}

export function useChildAcademics(childId?: string) {
  return useQuery({
    queryKey: ['parent-workspace', 'academics', childId],
    queryFn: () => parentWorkspaceApi.getAcademics(childId!),
    enabled: !!childId,
  });
}

export function useChildAttendance(childId?: string, month?: string) {
  return useQuery({
    queryKey: ['parent-workspace', 'attendance', childId, month ?? null],
    queryFn: () => parentWorkspaceApi.getAttendance(childId!, month),
    enabled: !!childId,
  });
}

export function useChildFees(childId?: string) {
  return useQuery({
    queryKey: ['parent-workspace', 'fees', childId],
    queryFn: () => parentWorkspaceApi.getFees(childId!),
    enabled: !!childId,
  });
}
