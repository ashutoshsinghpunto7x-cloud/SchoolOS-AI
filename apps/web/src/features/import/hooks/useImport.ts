import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { importApi } from '../api/import.api';
import { principalKeys } from '@/features/principal/hooks/usePrincipal';
import { accountantWorkspaceKeys } from '@/features/accountant-workspace/hooks/useAccountantWorkspace';
import type { ImportRowStatus, ImportStatus, ImportType } from '@schoolos/types';

/** Every cache an import can affect, invalidated once its background job
 *  actually finishes writing records — see useImportSession below. */
function invalidateImportedData(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['students'] });
  qc.invalidateQueries({ queryKey: ['teachers'] });
  qc.invalidateQueries({ queryKey: ['fees'] });
  qc.invalidateQueries({ queryKey: ['attendance'] });
  qc.invalidateQueries({ queryKey: principalKeys.all });
  qc.invalidateQueries({ queryKey: accountantWorkspaceKeys.all });
}

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
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: KEYS.session(id ?? ''),
    queryFn: () => importApi.getById(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'processing' || status === 'validating' || status === 'parsing') return 2000;
      return false;
    },
  });

  // Confirm/rollback trigger a background job on the server that keeps
  // running after the HTTP response returns, so the moment to refresh every
  // dashboard reading student/teacher/fee data is when polling here observes
  // the session actually settle to 'completed'/'rolled_back' — not when the
  // confirm/rollback mutation itself resolves.
  const notifiedRef = useRef<string | null>(null);
  useEffect(() => {
    const status = query.data?.status;
    if (!id || !status) return;
    if (status !== 'completed' && status !== 'rolled_back') return;
    const key = `${id}:${status}`;
    if (notifiedRef.current === key) return;
    notifiedRef.current = key;
    invalidateImportedData(qc);
  }, [id, query.data?.status, qc]);

  return query;
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

export function useSetDuplicateStrategy(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (strategy: 'skip' | 'update' | 'create') => importApi.setDuplicateStrategy(id, strategy),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.session(id) }),
  });
}

export function useAIMap(id: string) {
  return useMutation({
    mutationFn: () => importApi.aiMap(id),
  });
}

export function useMappingTemplates(importType: ImportType | undefined) {
  return useQuery({
    queryKey: ['import', 'mapping-templates', importType ?? ''],
    queryFn: () => importApi.listMappingTemplates(importType),
    enabled: !!importType,
  });
}

export function useSaveMappingTemplate(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => importApi.saveMappingTemplate(sessionId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import', 'mapping-templates'] }),
  });
}

export function useDeleteMappingTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => importApi.deleteMappingTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['import', 'mapping-templates'] }),
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
