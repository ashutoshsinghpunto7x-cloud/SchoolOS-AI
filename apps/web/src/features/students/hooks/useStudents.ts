import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi } from '../api/students.api';
import type {
  CreateStudentPayload,
  UpdateStudentPayload,
  StudentListOptions,
  CreateStudentNotePayload,
  UpdateStudentNotePayload,
} from '@schoolos/types';

// ── Query Keys ────────────────────────────────────────────────────────────────

export const studentKeys = {
  all: ['students'] as const,
  list: (search?: string) => [...studentKeys.all, 'list', search ?? ''] as const,
  paginated: (opts: StudentListOptions) => [...studentKeys.all, 'paginated', opts] as const,
  detail: (id: string) => [...studentKeys.all, 'detail', id] as const,
  notes: (studentId: string) => [...studentKeys.all, 'notes', studentId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/** Flat list — used by StudentSearch autocomplete in CommunicationWorkspace. */
export const useStudentList = (search?: string) => {
  return useQuery({
    queryKey: studentKeys.list(search),
    queryFn: () => studentsApi.list(search),
  });
};

/** Server-side paginated list for StudentListPage. */
export const useStudentsPaginated = (opts: StudentListOptions = {}) => {
  return useQuery({
    queryKey: studentKeys.paginated(opts),
    queryFn: () => studentsApi.listPaginated(opts),
    placeholderData: (prev) => prev,
  });
};

export const useStudent = (id: string) => {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: () => studentsApi.getById(id),
    enabled: Boolean(id),
  });
};

export const useStudentNotes = (studentId: string) => {
  return useQuery({
    queryKey: studentKeys.notes(studentId),
    queryFn: () => studentsApi.listNotes(studentId),
    enabled: Boolean(studentId),
  });
};

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStudentPayload) => studentsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
};

export const useUpdateStudent = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateStudentPayload) => studentsApi.update(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      queryClient.setQueryData(studentKeys.detail(id), updated);
    },
  });
};

export const useChangeStudentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      studentsApi.changeStatus(id, status, reason),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
      queryClient.setQueryData(studentKeys.detail(updated._id), updated);
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentsApi.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
};

export const useQuickImportStudents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, cls, section }: { file: File; cls: string; section: string }) =>
      studentsApi.quickImport(file, cls, section),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
};

export const useCreateNote = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStudentNotePayload) =>
      studentsApi.createNote(studentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.notes(studentId) });
    },
  });
};

export const useUpdateNote = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateStudentNotePayload }) =>
      studentsApi.updateNote(studentId, noteId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.notes(studentId) });
    },
  });
};

export const useDeleteNote = (studentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => studentsApi.deleteNote(studentId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studentKeys.notes(studentId) });
    },
  });
};
