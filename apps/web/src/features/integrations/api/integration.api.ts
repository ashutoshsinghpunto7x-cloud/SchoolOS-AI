import { apiClient, extractErrorMessage } from '@/services/api';
import type {
  ApiResponse,
  PaginatedResponse,
  Integration,
  SyncLog,
  ApiKey,
  WebhookEndpoint,
  WebhookDelivery,
  ProviderDefinition,
  IntegrationDashboardStats,
  TestConnectionResult,
  HealthStatus,
  IntegrationProviderType,
  IntegrationStatus,
} from '@schoolos/types';

const handle = async <T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> => {
  try {
    const res = await promise;
    return res.data.data!;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
};

const handlePaginated = async <T>(promise: Promise<{ data: PaginatedResponse<T> }>): Promise<PaginatedResponse<T>> => {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
};

export const integrationApi = {
  // Dashboard + Catalog
  getDashboard:  () => handle(apiClient.get<ApiResponse<IntegrationDashboardStats>>('/integrations/dashboard')),
  getCatalog:    () => handle(apiClient.get<ApiResponse<ProviderDefinition[]>>('/integrations/catalog')),

  // Integration CRUD
  list: (params: { providerType?: IntegrationProviderType; status?: IntegrationStatus } = {}) => {
    const q = new URLSearchParams();
    if (params.providerType) q.set('providerType', params.providerType);
    if (params.status)       q.set('status', params.status);
    return handle(apiClient.get<ApiResponse<Integration[]>>(`/integrations${q.toString() ? `?${q}` : ''}`));
  },
  getById:  (id: string)              => handle(apiClient.get<ApiResponse<Integration>>(`/integrations/${id}`)),
  create:   (body: unknown)           => handle(apiClient.post<ApiResponse<Integration>>('/integrations', body)),
  update:   (id: string, body: unknown) => handle(apiClient.patch<ApiResponse<Integration>>(`/integrations/${id}`, body)),
  delete:   (id: string)              => handle(apiClient.delete<ApiResponse<null>>(`/integrations/${id}`)),

  // Connection & Health
  testConnection: (id: string) => handle(apiClient.post<ApiResponse<TestConnectionResult>>(`/integrations/${id}/test`, {})),
  getHealth:      (id: string) => handle(apiClient.get<ApiResponse<HealthStatus>>(`/integrations/${id}/health`)),

  // Sync
  triggerSync:    (id: string) => handle(apiClient.post<ApiResponse<{ logId: string; message: string }>>(`/integrations/${id}/sync`, {})),
  getSyncHistory: (id: string, page = 1, limit = 20) =>
    handlePaginated(apiClient.get<PaginatedResponse<SyncLog>>(`/integrations/${id}/sync-history?page=${page}&limit=${limit}`)),
  getAllSyncHistory: (page = 1, limit = 20) =>
    handlePaginated(apiClient.get<PaginatedResponse<SyncLog>>(`/integrations/sync/history?page=${page}&limit=${limit}`)),

  // Webhooks
  listWebhooks:    () => handle(apiClient.get<ApiResponse<WebhookEndpoint[]>>('/integrations/webhooks')),
  createWebhook:   (body: unknown)            => handle(apiClient.post<ApiResponse<WebhookEndpoint>>('/integrations/webhooks', body)),
  updateWebhook:   (id: string, body: unknown) => handle(apiClient.patch<ApiResponse<WebhookEndpoint>>(`/integrations/webhooks/${id}`, body)),
  deleteWebhook:   (id: string)               => handle(apiClient.delete<ApiResponse<null>>(`/integrations/webhooks/${id}`)),
  getDeliveries:   (webhookId: string, page = 1) =>
    handlePaginated(apiClient.get<PaginatedResponse<WebhookDelivery>>(`/integrations/webhooks/${webhookId}/deliveries?page=${page}`)),
  getAllDeliveries: (page = 1) =>
    handlePaginated(apiClient.get<PaginatedResponse<WebhookDelivery>>(`/integrations/webhooks/deliveries?page=${page}`)),

  // API Keys
  listApiKeys:  () => handle(apiClient.get<ApiResponse<ApiKey[]>>('/integrations/apikeys')),
  createApiKey: (body: unknown) => handle(apiClient.post<ApiResponse<{ key: ApiKey; rawKey: string }>>('/integrations/apikeys', body)),
  rotateApiKey: (id: string)    => handle(apiClient.post<ApiResponse<{ key: ApiKey; rawKey: string }>>(`/integrations/apikeys/${id}/rotate`, {})),
  revokeApiKey: (id: string)    => handle(apiClient.post<ApiResponse<null>>(`/integrations/apikeys/${id}/revoke`, {})),
};
