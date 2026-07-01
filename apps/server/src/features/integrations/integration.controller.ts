import type { Request, Response } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { integrationService } from './integration.service';
import { syncService } from './sync.service';
import { webhookService } from './webhook.service';
import { apiKeyService } from './api-key.service';
import { listSyncLogsSchema, listWebhookDeliveriesSchema, listIntegrationsSchema } from './integration.validation';

const ctx = (req: Request) => buildAuthContext(req.user!, req.ip ?? undefined);

// ── Integration CRUD ──────────────────────────────────────────────────────────

const getCatalog = async (_req: Request, res: Response) => {
  const catalog = integrationService.getCatalog();
  return sendSuccess(res, catalog);
};

const getDashboard = async (req: Request, res: Response) => {
  const stats = await integrationService.getDashboardStats(ctx(req));
  return sendSuccess(res, stats);
};

const list = async (req: Request, res: Response) => {
  const { providerType, status } = listIntegrationsSchema.parse(req.query);
  const data = await integrationService.list(ctx(req), { providerType, status });
  return sendSuccess(res, data);
};

const getById = async (req: Request, res: Response) => {
  const data = await integrationService.getById(req.params.id, ctx(req));
  return sendSuccess(res, data);
};

const create = async (req: Request, res: Response) => {
  const data = await integrationService.create(req.body, ctx(req));
  return sendCreated(res, data);
};

const update = async (req: Request, res: Response) => {
  const data = await integrationService.update(req.params.id, req.body, ctx(req));
  return sendSuccess(res, data);
};

const remove = async (req: Request, res: Response) => {
  await integrationService.delete(req.params.id, ctx(req));
  return sendSuccess(res, null, 'Integration deleted');
};

const testConnection = async (req: Request, res: Response) => {
  const result = await integrationService.testConnection(req.params.id, ctx(req));
  return sendSuccess(res, result);
};

const getHealth = async (req: Request, res: Response) => {
  const result = await integrationService.getHealth(req.params.id, ctx(req));
  return sendSuccess(res, result);
};

// ── Sync ──────────────────────────────────────────────────────────────────────

const triggerSync = async (req: Request, res: Response) => {
  const result = await syncService.triggerSync(req.params.id, 'manual', ctx(req));
  return sendSuccess(res, result, 'Sync started');
};

const getSyncHistory = async (req: Request, res: Response) => {
  const { page, limit } = listSyncLogsSchema.parse(req.query);
  const { data, total } = await syncService.getSyncHistory(req.params.id, ctx(req), page, limit);
  return sendPaginated(res, data, { page, limit, total });
};

const getAllSyncHistory = async (req: Request, res: Response) => {
  const { page, limit } = listSyncLogsSchema.parse(req.query);
  const { data, total } = await syncService.getAllSyncHistory(ctx(req), page, limit);
  return sendPaginated(res, data, { page, limit, total });
};

// ── Webhooks ──────────────────────────────────────────────────────────────────

const listWebhooks = async (req: Request, res: Response) => {
  const data = await webhookService.list(ctx(req));
  return sendSuccess(res, data);
};

const createWebhook = async (req: Request, res: Response) => {
  const data = await webhookService.create(req.body, ctx(req));
  return sendCreated(res, data);
};

const updateWebhook = async (req: Request, res: Response) => {
  const data = await webhookService.update(req.params.id, req.body, ctx(req));
  return sendSuccess(res, data);
};

const deleteWebhook = async (req: Request, res: Response) => {
  await webhookService.delete(req.params.id, ctx(req));
  return sendSuccess(res, null, 'Webhook deleted');
};

const getWebhookDeliveries = async (req: Request, res: Response) => {
  const { page, limit } = listWebhookDeliveriesSchema.parse(req.query);
  const { data, total } = await webhookService.getDeliveries(req.params.id, ctx(req), page, limit);
  return sendPaginated(res, data, { page, limit, total });
};

const getAllDeliveries = async (req: Request, res: Response) => {
  const { page, limit } = listWebhookDeliveriesSchema.parse(req.query);
  const { data, total } = await webhookService.getAllDeliveries(ctx(req), page, limit);
  return sendPaginated(res, data, { page, limit, total });
};

// ── API Keys ──────────────────────────────────────────────────────────────────

const listApiKeys = async (req: Request, res: Response) => {
  const data = await apiKeyService.list(ctx(req));
  return sendSuccess(res, data);
};

const createApiKey = async (req: Request, res: Response) => {
  const { key, rawKey } = await apiKeyService.create(req.body, ctx(req));
  return sendCreated(res, { key, rawKey }, 'API key created — save the raw key now, it will not be shown again');
};

const rotateApiKey = async (req: Request, res: Response) => {
  const { key, rawKey } = await apiKeyService.rotate(req.params.id, ctx(req));
  return sendSuccess(res, { key, rawKey }, 'API key rotated — save the new raw key now');
};

const revokeApiKey = async (req: Request, res: Response) => {
  await apiKeyService.revoke(req.params.id, ctx(req));
  return sendSuccess(res, null, 'API key revoked');
};

export const integrationController = {
  getCatalog,
  getDashboard,
  list,
  getById,
  create,
  update,
  remove,
  testConnection,
  getHealth,
  triggerSync,
  getSyncHistory,
  getAllSyncHistory,
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  getAllDeliveries,
  listApiKeys,
  createApiKey,
  rotateApiKey,
  revokeApiKey,
};
