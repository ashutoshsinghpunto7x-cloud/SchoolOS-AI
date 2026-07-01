import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { integrationController } from './integration.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

// ── Provider Catalog ──────────────────────────────────────────────────────────
router.get('/catalog',    integrationController.getCatalog);
router.get('/dashboard',  integrationController.getDashboard);

// ── Integrations CRUD ─────────────────────────────────────────────────────────
router.get('/',                   integrationController.list);
router.post('/',                  integrationController.create);
router.get('/:id',                integrationController.getById);
router.patch('/:id',              integrationController.update);
router.delete('/:id',             integrationController.remove);

// ── Connection & Health ───────────────────────────────────────────────────────
router.post('/:id/test',          integrationController.testConnection);
router.get('/:id/health',         integrationController.getHealth);

// ── Sync ──────────────────────────────────────────────────────────────────────
router.post('/:id/sync',          integrationController.triggerSync);
router.get('/:id/sync-history',   integrationController.getSyncHistory);
router.get('/sync/history',       integrationController.getAllSyncHistory);

// ── Webhooks ──────────────────────────────────────────────────────────────────
router.get('/webhooks',                         integrationController.listWebhooks);
router.post('/webhooks',                        integrationController.createWebhook);
router.patch('/webhooks/:id',                   integrationController.updateWebhook);
router.delete('/webhooks/:id',                  integrationController.deleteWebhook);
router.get('/webhooks/:id/deliveries',          integrationController.getWebhookDeliveries);
router.get('/webhooks/deliveries',              integrationController.getAllDeliveries);

// ── API Keys ──────────────────────────────────────────────────────────────────
router.get('/apikeys',             integrationController.listApiKeys);
router.post('/apikeys',            integrationController.createApiKey);
router.post('/apikeys/:id/rotate', integrationController.rotateApiKey);
router.post('/apikeys/:id/revoke', integrationController.revokeApiKey);

export default router;
