import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teachersApi } from '../api/teachers.api';
import type {
  CreateTeacherPayload,
  UpdateTeacherPayload,
  TeacherListOptions,
  CreateTeacherNotePayload,
  UpdateTeacherNotePayload,
  CreateTeacherLoginPayload,
} from '@schoolos/types';

// ── Query Keys ────────────────────────────────────────────────────────────────

export const teacherKeys = {
  all:       ['teachers'] as const,
  list:      (search?: string) => [...teacherKeys.all, 'list', search ?? ''] as const,
  paginated: (opts: TeacherListOptions) => [...teacherKeys.all, 'paginated', opts] as const,
  detail:    (id: string) => [...teacherKeys.all, 'detail', id] as const,
  notes:     (teacherId: string) => [...teacherKeys.all, 'notes', teacherId] as const,
  loginStatus: () => [...teacherKeys.all, 'login-status'] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/** Flat list for autocomplete. */
export const useTeacherList = (search?: string) =>
  useQuery({
    queryKey: teacherKeys.list(search),
    queryFn:  () => teachersApi.list(search),
  });

/** Server-side paginated list for TeacherListPage. */
export const useTeachersPaginated = (opts: TeacherListOptions = {}) =>
  useQuery({
    queryKey:        teacherKeys.paginated(opts),
    queryFn:         () => teachersApi.listPaginated(opts),
    placeholderData: (prev) => prev,
  });

export const useTeacher = (id: string) =>
  useQuery({
    queryKey: teacherKeys.detail(id),
    queryFn:  () => teachersApi.getById(id),
    enabled:  Boolean(id),
  });

export const useTeacherNotes = (teacherId: string) =>
  useQuery({
    queryKey: teacherKeys.notes(teacherId),
    queryFn:  () => teachersApi.listNotes(teacherId),
    enabled:  Boolean(teacherId),
  });

export const useTeacherLoginStatus = () =>
  useQuery({
    queryKey: teacherKeys.loginStatus(),
    queryFn:  () => teachersApi.getLoginStatus(),
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTeacherPayload) => teachersApi.create(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: teacherKeys.all }),
  });
};

export const useUpdateTeacher = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTeacherPayload) => teachersApi.update(id, payload),
    onSuccess:  (updated) => {
      qc.invalidateQueries({ queryKey: teacherKeys.all });
      qc.setQueryData(teacherKeys.detail(id), updated);
    },
  });
};

export const useUploadTeacherPhoto = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => teachersApi.uploadPhoto(id, file),
    onSuccess:  (updated) => {
      qc.invalidateQueries({ queryKey: teacherKeys.all });
      qc.setQueryData(teacherKeys.detail(id), updated);
    },
  });
};

export const useRemoveTeacherPhoto = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => teachersApi.removePhoto(id),
    onSuccess:  (updated) => {
      qc.invalidateQueries({ queryKey: teacherKeys.all });
      qc.setQueryData(teacherKeys.detail(id), updated);
    },
  });
};

export const useChangeTeacherStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      teachersApi.changeStatus(id, status, reason),
    onSuccess:  (updated) => {
      qc.invalidateQueries({ queryKey: teacherKeys.all });
      qc.setQueryData(teacherKeys.detail(updated._id), updated);
    },
  });
};

export const useDeleteTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teachersApi.deleteTeacher(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: teacherKeys.all }),
  });
};

export const useLinkTeacherUser = (teacherId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => teachersApi.linkUser(teacherId, userId),
    onSuccess:  (updated) => {
      qc.invalidateQueries({ queryKey: teacherKeys.all });
      qc.setQueryData(teacherKeys.detail(teacherId), updated);
    },
  });
};

export const useCreateTeacherLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teacherId, payload }: { teacherId: string; payload: CreateTeacherLoginPayload }) =>
      teachersApi.createLogin(teacherId, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: teacherKeys.loginStatus() }),
  });
};

export const useCreateTeacherNote = (teacherId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTeacherNotePayload) => teachersApi.createNote(teacherId, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: teacherKeys.notes(teacherId) }),
  });
};

export const useUpdateTeacherNote = (teacherId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateTeacherNotePayload }) =>
      teachersApi.updateNote(teacherId, noteId, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: teacherKeys.notes(teacherId) }),
  });
};

export const useDeleteTeacherNote = (teacherId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => teachersApi.deleteNote(teacherId, noteId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: teacherKeys.notes(teacherId) }),
  });
};
