import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportCardTemplateApi } from '../api/report-card-template.api';
import type {
  CreateReportCardTemplatePayload,
  UpdateReportCardTemplatePayload,
  CloneReportCardTemplatePayload,
  ReportCardTemplateListOptions,
} from '@schoolos/types';

export const reportCardTemplateKeys = {
  all: ['report-card-templates'] as const,
  list: (opts: ReportCardTemplateListOptions) => ['report-card-templates', 'list', opts] as const,
  detail: (id: string) => ['report-card-templates', 'detail', id] as const,
  byClassYear: (cls: string, year: string) => ['report-card-templates', 'class-year', cls, year] as const,
};

export const useReportCardTemplates = (opts: ReportCardTemplateListOptions = {}) =>
  useQuery({
    queryKey: reportCardTemplateKeys.list(opts),
    queryFn: () => reportCardTemplateApi.list(opts),
  });

export const useReportCardTemplate = (id?: string) =>
  useQuery({
    queryKey: reportCardTemplateKeys.detail(id ?? ''),
    queryFn: () => reportCardTemplateApi.getById(id!),
    enabled: Boolean(id),
  });

export const useReportCardTemplateByClassYear = (cls?: string, academicYear?: string) =>
  useQuery({
    queryKey: reportCardTemplateKeys.byClassYear(cls ?? '', academicYear ?? ''),
    queryFn: () => reportCardTemplateApi.getByClassYear(cls!, academicYear!),
    enabled: Boolean(cls && academicYear),
  });

export const useCreateReportCardTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReportCardTemplatePayload) => reportCardTemplateApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportCardTemplateKeys.all }),
  });
};

export const useUpdateReportCardTemplate = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateReportCardTemplatePayload) => reportCardTemplateApi.update(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(reportCardTemplateKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: reportCardTemplateKeys.all });
    },
  });
};

export const usePublishReportCardTemplate = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reportCardTemplateApi.publish(id),
    onSuccess: (data) => {
      qc.setQueryData(reportCardTemplateKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: reportCardTemplateKeys.all });
    },
  });
};

export const useUnpublishReportCardTemplate = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reportCardTemplateApi.unpublish(id),
    onSuccess: (data) => {
      qc.setQueryData(reportCardTemplateKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: reportCardTemplateKeys.all });
    },
  });
};

export const useDeleteReportCardTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reportCardTemplateApi.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportCardTemplateKeys.all }),
  });
};

export const useCloneReportCardTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cls, payload }: { cls: string; payload: CloneReportCardTemplatePayload }) =>
      reportCardTemplateApi.clone(cls, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportCardTemplateKeys.all }),
  });
};
