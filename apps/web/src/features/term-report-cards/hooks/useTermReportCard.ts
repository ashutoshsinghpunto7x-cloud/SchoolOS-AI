import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { termReportCardApi } from '../api/term-report-card.api';
import type { UpdateTermReportCardPayload, UpdateTermReportCardSkillsPayload } from '@schoolos/types';

export const termReportCardKeys = {
  all: ['term-report-cards'] as const,
  roster: (cls: string, section: string, year: string) => ['term-report-cards', 'roster', cls, section, year] as const,
  byStudentYear: (studentId: string, year: string) => ['term-report-cards', 'by-student-year', studentId, year] as const,
  detail: (id: string) => ['term-report-cards', 'detail', id] as const,
  verify: (token: string) => ['term-report-cards', 'verify', token] as const,
};

export const useTermReportCardRoster = (cls: string, section: string, academicYear: string) =>
  useQuery({
    queryKey: termReportCardKeys.roster(cls, section, academicYear),
    queryFn: () => termReportCardApi.getRoster(cls, section, academicYear),
    enabled: Boolean(cls && section && academicYear),
  });

export const useTermReportCardByStudentYear = (studentId: string, academicYear: string) =>
  useQuery({
    queryKey: termReportCardKeys.byStudentYear(studentId, academicYear),
    queryFn: () => termReportCardApi.getByStudentYear(studentId, academicYear),
    enabled: Boolean(studentId && academicYear),
  });

export const useGenerateTermReportCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { studentId: string; academicYear: string }) => termReportCardApi.generate(payload),
    onSuccess: (data) => {
      qc.setQueryData(termReportCardKeys.byStudentYear(data.studentId, data.academicYear), data);
      qc.setQueryData(termReportCardKeys.detail(data._id), data);
      qc.invalidateQueries({ queryKey: termReportCardKeys.roster(data.class, data.section, data.academicYear) });
    },
  });
};

export const useUpdateTermReportCard = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTermReportCardPayload) => termReportCardApi.update(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(termReportCardKeys.detail(id), data);
      qc.setQueryData(termReportCardKeys.byStudentYear(data.studentId, data.academicYear), data);
    },
  });
};

export const useUpdateTermReportCardSkills = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTermReportCardSkillsPayload) => termReportCardApi.updateSkills(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(termReportCardKeys.detail(id), data);
      qc.setQueryData(termReportCardKeys.byStudentYear(data.studentId, data.academicYear), data);
    },
  });
};

export const usePublishTermReportCard = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => termReportCardApi.publish(id),
    onSuccess: (data) => {
      qc.setQueryData(termReportCardKeys.detail(id), data);
      qc.setQueryData(termReportCardKeys.byStudentYear(data.studentId, data.academicYear), data);
    },
  });
};

export const useTermReportCardQr = (id: string) =>
  useQuery({
    queryKey: ['term-report-cards', 'qr', id],
    queryFn: () => termReportCardApi.getQrImage(id),
    enabled: Boolean(id),
    staleTime: Infinity,
  });

export const useVerifyTermReportCard = (token: string) =>
  useQuery({
    queryKey: termReportCardKeys.verify(token),
    queryFn: () => termReportCardApi.verify(token),
    enabled: Boolean(token),
    retry: false,
  });
