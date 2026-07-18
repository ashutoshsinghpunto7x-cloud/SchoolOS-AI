import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ConvertToStudentPayload,
  CreateEnquiryNotePayload,
  CreateEnquiryPayload,
  EnquiryListOptions,
  UpdateEnquiryNotePayload,
  UpdateEnquiryPayload,
  UpdateEnquiryStagePayload,
} from '@schoolos/types';
import { enquiriesApi } from './api';

export const enquiryKeys = {
  list: (options: EnquiryListOptions) => ['enquiries', 'list', options] as const,
  stageCounts: () => ['enquiries', 'stage-counts'] as const,
  detail: (id: string) => ['enquiries', 'detail', id] as const,
  notes: (enquiryId: string) => ['enquiries', 'notes', enquiryId] as const,
};

export function useEnquiries(options: EnquiryListOptions = {}) {
  return useQuery({
    queryKey: enquiryKeys.list(options),
    queryFn: () => enquiriesApi.list(options),
  });
}

const ENQUIRY_PAGE_SIZE = 20;

// Server-driven pagination, same pattern as useInfiniteTeachers — the
// admissions pipeline can grow into the thousands over a school year.
export function useInfiniteEnquiries(filters: Omit<EnquiryListOptions, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: ['enquiries', 'infinite', filters],
    queryFn: ({ pageParam }) => enquiriesApi.list({ ...filters, page: pageParam, limit: ENQUIRY_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined),
  });
}

export function useStageCounts() {
  return useQuery({
    queryKey: enquiryKeys.stageCounts(),
    queryFn: () => enquiriesApi.getStageCounts(),
  });
}

export function useEnquiry(id: string) {
  return useQuery({
    queryKey: enquiryKeys.detail(id),
    queryFn: () => enquiriesApi.getById(id),
    enabled: !!id,
  });
}

function useInvalidateEnquiry(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: enquiryKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: ['enquiries', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['enquiries', 'infinite'] });
    queryClient.invalidateQueries({ queryKey: enquiryKeys.stageCounts() });
  };
}

export function useCreateEnquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEnquiryPayload) => enquiriesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['enquiries', 'infinite'] });
      queryClient.invalidateQueries({ queryKey: enquiryKeys.stageCounts() });
    },
  });
}

export function useUpdateEnquiry(id: string) {
  const invalidate = useInvalidateEnquiry(id);
  return useMutation({
    mutationFn: (payload: UpdateEnquiryPayload) => enquiriesApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateEnquiryStage(id: string) {
  const invalidate = useInvalidateEnquiry(id);
  return useMutation({
    mutationFn: (payload: UpdateEnquiryStagePayload) => enquiriesApi.updateStage(id, payload),
    onSuccess: invalidate,
  });
}

export function useConvertEnquiry(id: string) {
  const invalidate = useInvalidateEnquiry(id);
  return useMutation({
    mutationFn: (payload: ConvertToStudentPayload) => enquiriesApi.convert(id, payload),
    onSuccess: invalidate,
  });
}

export function useEnquiryNotes(enquiryId: string) {
  return useQuery({
    queryKey: enquiryKeys.notes(enquiryId),
    queryFn: () => enquiriesApi.listNotes(enquiryId),
    enabled: !!enquiryId,
  });
}

function useInvalidateNotes(enquiryId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: enquiryKeys.notes(enquiryId) });
}

export function useCreateEnquiryNote(enquiryId: string) {
  const invalidate = useInvalidateNotes(enquiryId);
  return useMutation({
    mutationFn: (payload: CreateEnquiryNotePayload) => enquiriesApi.createNote(enquiryId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateEnquiryNote(enquiryId: string) {
  const invalidate = useInvalidateNotes(enquiryId);
  return useMutation({
    mutationFn: ({ noteId, payload }: { noteId: string; payload: UpdateEnquiryNotePayload }) =>
      enquiriesApi.updateNote(enquiryId, noteId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteEnquiryNote(enquiryId: string) {
  const invalidate = useInvalidateNotes(enquiryId);
  return useMutation({
    mutationFn: (noteId: string) => enquiriesApi.deleteNote(enquiryId, noteId),
    onSuccess: invalidate,
  });
}
