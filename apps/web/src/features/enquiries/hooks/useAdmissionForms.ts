import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { admissionFormApi } from '../api/admission-form.api';
import type {
  IssueAdmissionFormPayload, UpdateAdmissionFormPaymentPayload, VerifyAdmissionFormPayload,
  AddChecklistItemPayload, UpdateChecklistItemPayload, AdmissionFormListOptions,
} from '@schoolos/types';
import { enquiryKeys } from './useEnquiries';

export const admissionFormKeys = {
  all:      ['admission-forms'] as const,
  lists:    () => [...admissionFormKeys.all, 'list'] as const,
  list:     (o: AdmissionFormListOptions) => [...admissionFormKeys.lists(), o] as const,
  byEnquiry:(enquiryId: string) => [...admissionFormKeys.all, 'by-enquiry', enquiryId] as const,
};

export const useAdmissionForms = (opts: AdmissionFormListOptions = {}) =>
  useQuery({
    queryKey: admissionFormKeys.list(opts),
    queryFn:  () => admissionFormApi.list(opts),
    placeholderData: keepPreviousData,
  });

export const useAdmissionFormByEnquiry = (enquiryId: string) =>
  useQuery({
    queryKey: admissionFormKeys.byEnquiry(enquiryId),
    queryFn:  () => admissionFormApi.getByEnquiry(enquiryId),
    enabled:  !!enquiryId,
  });

// Verifying a form also updates the linked Enquiry's stage (see
// admission-form.service.ts server-side) — invalidate both caches.
function invalidateFormsAndEnquiries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: admissionFormKeys.all });
  qc.invalidateQueries({ queryKey: enquiryKeys.all });
}

export const useIssueAdmissionForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: IssueAdmissionFormPayload) => admissionFormApi.issue(payload),
    onSuccess:  () => invalidateFormsAndEnquiries(qc),
  });
};

export const useUpdateAdmissionFormPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAdmissionFormPaymentPayload }) =>
      admissionFormApi.updatePayment(id, payload),
    onSuccess: () => invalidateFormsAndEnquiries(qc),
  });
};

export const useRecordAdmissionFormSubmission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => admissionFormApi.recordSubmission(id),
    onSuccess:  () => invalidateFormsAndEnquiries(qc),
  });
};

export const useResubmitAdmissionForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => admissionFormApi.resubmit(id),
    onSuccess:  () => invalidateFormsAndEnquiries(qc),
  });
};

export const useVerifyAdmissionForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VerifyAdmissionFormPayload }) =>
      admissionFormApi.verify(id, payload),
    onSuccess: () => invalidateFormsAndEnquiries(qc),
  });
};

export const useAddChecklistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AddChecklistItemPayload }) =>
      admissionFormApi.addChecklistItem(id, payload),
    onSuccess: () => invalidateFormsAndEnquiries(qc),
  });
};

export const useRemoveChecklistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) => admissionFormApi.removeChecklistItem(id, itemId),
    onSuccess:  () => invalidateFormsAndEnquiries(qc),
  });
};

export const useUpdateChecklistItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId, payload }: { id: string; itemId: string; payload: UpdateChecklistItemPayload }) =>
      admissionFormApi.updateChecklistItem(id, itemId, payload),
    onSuccess: () => invalidateFormsAndEnquiries(qc),
  });
};

export const useUploadChecklistItemFile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, itemId, file }: { id: string; itemId: string; file: File }) =>
      admissionFormApi.uploadChecklistItemFile(id, itemId, file),
    onSuccess: () => invalidateFormsAndEnquiries(qc),
  });
};
