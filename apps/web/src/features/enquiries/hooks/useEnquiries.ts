import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enquiriesApi } from '../api/enquiries.api';
import type {
  CreateEnquiryPayload,
  UpdateEnquiryPayload,
  UpdateEnquiryStagePayload,
  ConvertToStudentPayload,
  EnquiryListOptions,
  CreateEnquiryNotePayload,
  UpdateEnquiryNotePayload,
} from '@schoolos/types';

// ── Query Keys ────────────────────────────────────────────────────────────────

export const enquiryKeys = {
  all:         ['enquiries'] as const,
  lists:       () => [...enquiryKeys.all, 'list'] as const,
  list:        (opts: EnquiryListOptions) => [...enquiryKeys.lists(), opts] as const,
  detail:      (id: string) => [...enquiryKeys.all, 'detail', id] as const,
  stageCounts: () => [...enquiryKeys.all, 'stage-counts'] as const,
  notes:       (id: string) => [...enquiryKeys.all, 'notes', id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export const useEnquiries = (opts: EnquiryListOptions = {}) =>
  useQuery({
    queryKey:        enquiryKeys.list(opts),
    queryFn:         () => enquiriesApi.list(opts),
    placeholderData: (prev) => prev,
  });

export const useEnquiry = (id: string) =>
  useQuery({
    queryKey: enquiryKeys.detail(id),
    queryFn:  () => enquiriesApi.getById(id),
    enabled:  Boolean(id),
  });

export const useEnquiryStageCounts = () =>
  useQuery({
    queryKey: enquiryKeys.stageCounts(),
    queryFn:  () => enquiriesApi.getStageCounts(),
  });

export const useEnquiryNotes = (enquiryId: string) =>
  useQuery({
    queryKey: enquiryKeys.notes(enquiryId),
    queryFn:  () => enquiriesApi.listNotes(enquiryId),
    enabled:  Boolean(enquiryId),
  });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateEnquiry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEnquiryPayload) => enquiriesApi.create(payload),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: enquiryKeys.lists() });
      qc.invalidateQueries({ queryKey: enquiryKeys.stageCounts() });
    },
  });
};

export const useUpdateEnquiry = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEnquiryPayload) => enquiriesApi.update(id, payload),
    onSuccess:  (updated) => {
      qc.setQueryData(enquiryKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: enquiryKeys.lists() });
    },
  });
};

export const useUpdateEnquiryStage = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateEnquiryStagePayload) => enquiriesApi.updateStage(id, payload),
    onSuccess:  (updated) => {
      qc.setQueryData(enquiryKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: enquiryKeys.lists() });
      qc.invalidateQueries({ queryKey: enquiryKeys.stageCounts() });
    },
  });
};

export const useConvertToStudent = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConvertToStudentPayload) => enquiriesApi.convert(id, payload),
    onSuccess:  (result) => {
      qc.setQueryData(enquiryKeys.detail(id), result.enquiry);
      qc.invalidateQueries({ queryKey: enquiryKeys.lists() });
      qc.invalidateQueries({ queryKey: enquiryKeys.stageCounts() });
      // Invalidate students list so new student appears
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useDeleteEnquiry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => enquiriesApi.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: enquiryKeys.all });
    },
  });
};

// ── Note Mutations ─────────────────────────────────────────────────────────────

export const useCreateEnquiryNote = (enquiryId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEnquiryNotePayload) => enquiriesApi.createNote(enquiryId, payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: enquiryKeys.notes(enquiryId) }),
  });
};

export const useUpdateEnquiryNote = (enquiryId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateEnquiryNotePayload }) =>
      enquiriesApi.updateNote(enquiryId, noteId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: enquiryKeys.notes(enquiryId) }),
  });
};

export const useDeleteEnquiryNote = (enquiryId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => enquiriesApi.deleteNote(enquiryId, noteId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: enquiryKeys.notes(enquiryId) }),
  });
};
