import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { importApi } from '../api/import.api';
import type { ImportRowStatus, ImportStatus, ImportType } from '@schoolos/types';

const KEYS = {
  sessions: (filters?: object) => ['import', 'sessions', filters ?? {}] as const,
  session: (id: string) => ['import', 'session', id] as const,
  rows: (id: string, filters?: object) => ['import', 'session', id, 'rows', filters ?? {}] as const,
  templates: () => ['import', 'templates'] as const,
};

export function useImportSessions(params: { page?: number; limit?: number; importType?: ImportType; status?: ImportStatus } = {}) {
  return useQuery({
    queryKey: KEYS.sessions(params),
    queryFn: () => importApi.list(params),
  });
}

export function useImportSession(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.session(id ?? ''),
    queryFn: () => importApi.getById(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'processing' || status === 'validating' || status === 'parsing') return 2000;
      return false;
    },
  });
}

export function useImportRows(id: string | undefined, params: { page?: number; limit?: number; status?: ImportRowStatus } = {}) {
  return useQuery({
    queryKey: KEYS.rows(id ?? '', params),
    queryFn: () => importApi.getRows(id!, params),
    enabled: !!id,
  });
}

export function useImportTemplates() {
  return useQuery({
    queryKey: KEYS.templates(),
    queryFn: () => importApi.listTemplates(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ importType, file }: { importType: ImportType; file: File }) =>
      importApi.upload(importType, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import', 'sessions'] }),
  });
}

export function useUpdateMapping(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mapping: Record<string, string>) => importApi.updateMapping(id, mapping),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.session(id) }),
  });
}

export function useConfirmImport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => importApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.session(id) });
      qc.invalidateQueries({ queryKey: ['import', 'sessions'] });
    },
  });
}

export function useCancelImport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => importApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.session(id) });
      qc.invalidateQueries({ queryKey: ['import', 'sessions'] });
    },
  });
}

export function useRollbackImport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => importApi.rollback(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.session(id) });
      qc.invalidateQueries({ queryKey: ['import', 'sessions'] });
    },
  });
}
