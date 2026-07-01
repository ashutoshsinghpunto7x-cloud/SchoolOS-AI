import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationApi } from '../api/integration.api';
import type { IntegrationProviderType, IntegrationStatus } from '@schoolos/types';

const KEYS = {
  dashboard:    () => ['integrations', 'dashboard'] as const,
  catalog:      () => ['integrations', 'catalog'] as const,
  list:         (f?: object) => ['integrations', 'list', f ?? {}] as const,
  detail:       (id: string) => ['integrations', 'detail', id] as const,
  syncHistory:  (id: string, p: number) => ['integrations', 'syncHistory', id, p] as const,
  allSyncHistory: (p: number) => ['integrations', 'syncHistory', 'all', p] as const,
  webhooks:     () => ['integrations', 'webhooks'] as const,
  deliveries:   (id: string, p: number) => ['integrations', 'deliveries', id, p] as const,
  apikeys:      () => ['integrations', 'apikeys'] as const,
};

export function useIntegrationDashboard() {
  return useQuery({ queryKey: KEYS.dashboard(), queryFn: integrationApi.getDashboard });
}

export function useProviderCatalog() {
  return useQuery({ queryKey: KEYS.catalog(), queryFn: integrationApi.getCatalog, staleTime: 10 * 60 * 1000 });
}

export function useIntegrations(filters: { providerType?: IntegrationProviderType; status?: IntegrationStatus } = {}) {
  return useQuery({ queryKey: KEYS.list(filters), queryFn: () => integrationApi.list(filters) });
}

export function useIntegration(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn: () => integrationApi.getById(id!),
    enabled: !!id,
    refetchInterval: (query) => query.state.data?.status === 'syncing' ? 2000 : false,
  });
}

export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => integrationApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'list'] });
      qc.invalidateQueries({ queryKey: KEYS.dashboard() });
    },
  });
}

export function useUpdateIntegration(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => integrationApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: ['integrations', 'list'] });
    },
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations', 'list'] });
      qc.invalidateQueries({ queryKey: KEYS.dashboard() });
    },
  });
}

export function useTestConnection(id: string) {
  return useMutation({ mutationFn: () => integrationApi.testConnection(id) });
}

export function useTriggerSync(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => integrationApi.triggerSync(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.detail(id) }),
  });
}

export function useSyncHistory(id: string, page = 1) {
  return useQuery({ queryKey: KEYS.syncHistory(id, page), queryFn: () => integrationApi.getSyncHistory(id, page) });
}

export function useAllSyncHistory(page = 1) {
  return useQuery({ queryKey: KEYS.allSyncHistory(page), queryFn: () => integrationApi.getAllSyncHistory(page) });
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

export function useWebhooks() {
  return useQuery({ queryKey: KEYS.webhooks(), queryFn: integrationApi.listWebhooks });
}

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => integrationApi.createWebhook(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.webhooks() }),
  });
}

export function useUpdateWebhook(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => integrationApi.updateWebhook(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.webhooks() }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationApi.deleteWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.webhooks() }),
  });
}

export function useWebhookDeliveries(webhookId: string, page = 1) {
  return useQuery({ queryKey: KEYS.deliveries(webhookId, page), queryFn: () => integrationApi.getDeliveries(webhookId, page) });
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export function useApiKeys() {
  return useQuery({ queryKey: KEYS.apikeys(), queryFn: integrationApi.listApiKeys });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => integrationApi.createApiKey(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.apikeys() }),
  });
}

export function useRotateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationApi.rotateApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.apikeys() }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationApi.revokeApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.apikeys() }),
  });
}
