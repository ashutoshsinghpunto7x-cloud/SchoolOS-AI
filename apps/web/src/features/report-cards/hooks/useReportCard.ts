import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportCardApi } from '../api/report-card.api';
import type { UpdateReportCardPayload } from '@schoolos/types';

export const reportCardKeys = {
  all: ['report-cards'] as const,
  roster: (examId: string, cls: string, section: string) => ['report-cards', 'roster', examId, cls, section] as const,
  byExamStudent: (examId: string, studentId: string) => ['report-cards', 'by-exam-student', examId, studentId] as const,
  detail: (id: string) => ['report-cards', 'detail', id] as const,
  verify: (token: string) => ['report-cards', 'verify', token] as const,
};

export const useReportCardRoster = (examId: string, cls: string, section: string) =>
  useQuery({
    queryKey: reportCardKeys.roster(examId, cls, section),
    queryFn: () => reportCardApi.getRoster(examId, cls, section),
    enabled: Boolean(examId && cls && section),
  });

export const useReportCardByExamStudent = (examId: string, studentId: string) =>
  useQuery({
    queryKey: reportCardKeys.byExamStudent(examId, studentId),
    queryFn: () => reportCardApi.getByExamStudent(examId, studentId),
    enabled: Boolean(examId && studentId),
  });

export const useGenerateReportCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { examId: string; studentId: string }) => reportCardApi.generate(payload),
    onSuccess: (data) => {
      qc.setQueryData(reportCardKeys.byExamStudent(data.examId, data.studentId), data);
      qc.setQueryData(reportCardKeys.detail(data._id), data);
    },
  });
};

export const useUpdateReportCard = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateReportCardPayload) => reportCardApi.update(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(reportCardKeys.detail(id), data);
      qc.setQueryData(reportCardKeys.byExamStudent(data.examId, data.studentId), data);
    },
  });
};

export const useRegenerateRemark = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reportCardApi.regenerateRemark(id),
    onSuccess: (data) => {
      qc.setQueryData(reportCardKeys.detail(id), data);
      qc.setQueryData(reportCardKeys.byExamStudent(data.examId, data.studentId), data);
    },
  });
};

export const usePublishReportCard = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reportCardApi.publish(id),
    onSuccess: (data) => {
      qc.setQueryData(reportCardKeys.detail(id), data);
      qc.setQueryData(reportCardKeys.byExamStudent(data.examId, data.studentId), data);
    },
  });
};

export const useReportCardQr = (id: string) =>
  useQuery({
    queryKey: ['report-cards', 'qr', id],
    queryFn: () => reportCardApi.getQrImage(id),
    enabled: Boolean(id),
    staleTime: Infinity,
  });

export const useVerifyReportCard = (token: string) =>
  useQuery({
    queryKey: reportCardKeys.verify(token),
    queryFn: () => reportCardApi.verify(token),
    enabled: Boolean(token),
    retry: false,
  });
