import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ChangeStatusPayload,
  CreateTeacherNotePayload,
  CreateTeacherPayload,
  TeacherListOptions,
  UpdateTeacherNotePayload,
  UpdateTeacherPayload,
} from '@schoolos/types';
import { PickedImage, teachersApi } from './api';

export const teacherKeys = {
  list: (options: TeacherListOptions) => ['teachers', 'list', options] as const,
  search: (query: string) => ['teachers', 'search', query] as const,
  detail: (id: string) => ['teachers', 'detail', id] as const,
  notes: (teacherId: string) => ['teachers', 'notes', teacherId] as const,
};

export function useTeachers(options: TeacherListOptions = {}) {
  return useQuery({
    queryKey: teacherKeys.list(options),
    queryFn: () => teachersApi.list(options),
  });
}

const TEACHER_PAGE_SIZE = 20;

// Server-driven pagination via useInfiniteQuery — required at the 1,000+
// teacher scale the app targets; a client-side filtered list would mean
// fetching the entire roster up front.
export function useInfiniteTeachers(filters: Omit<TeacherListOptions, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: ['teachers', 'infinite', filters],
    queryFn: ({ pageParam }) => teachersApi.list({ ...filters, page: pageParam, limit: TEACHER_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined),
  });
}

export function useTeacherSearch(query: string) {
  return useQuery({
    queryKey: teacherKeys.search(query),
    queryFn: () => teachersApi.search(query),
    enabled: query.trim().length > 0,
  });
}

export function useTeacher(id: string) {
  return useQuery({
    queryKey: teacherKeys.detail(id),
    queryFn: () => teachersApi.getById(id),
    enabled: !!id,
  });
}

function useInvalidateTeacher(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: teacherKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: ['teachers', 'list'] });
  };
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTeacherPayload) => teachersApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers', 'list'] }),
  });
}

export function useUpdateTeacher(id: string) {
  const invalidate = useInvalidateTeacher(id);
  return useMutation({
    mutationFn: (payload: UpdateTeacherPayload) => teachersApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useChangeTeacherStatus(id: string) {
  const invalidate = useInvalidateTeacher(id);
  return useMutation({
    mutationFn: (payload: ChangeStatusPayload) => teachersApi.changeStatus(id, payload),
    onSuccess: invalidate,
  });
}

export function useUploadTeacherPhoto(id: string) {
  const invalidate = useInvalidateTeacher(id);
  return useMutation({
    mutationFn: (image: PickedImage) => teachersApi.uploadPhoto(id, image),
    onSuccess: invalidate,
  });
}

export function useRemoveTeacherPhoto(id: string) {
  const invalidate = useInvalidateTeacher(id);
  return useMutation({
    mutationFn: () => teachersApi.removePhoto(id),
    onSuccess: invalidate,
  });
}

export function useTeacherNotes(teacherId: string) {
  return useQuery({
    queryKey: teacherKeys.notes(teacherId),
    queryFn: () => teachersApi.listNotes(teacherId),
    enabled: !!teacherId,
  });
}

function useInvalidateNotes(teacherId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: teacherKeys.notes(teacherId) });
}

export function useCreateTeacherNote(teacherId: string) {
  const invalidate = useInvalidateNotes(teacherId);
  return useMutation({
    mutationFn: (payload: CreateTeacherNotePayload) => teachersApi.createNote(teacherId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTeacherNote(teacherId: string) {
  const invalidate = useInvalidateNotes(teacherId);
  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateTeacherNotePayload }) =>
      teachersApi.updateNote(teacherId, noteId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteTeacherNote(teacherId: string) {
  const invalidate = useInvalidateNotes(teacherId);
  return useMutation({
    mutationFn: (noteId: string) => teachersApi.deleteNote(teacherId, noteId),
    onSuccess: invalidate,
  });
}
