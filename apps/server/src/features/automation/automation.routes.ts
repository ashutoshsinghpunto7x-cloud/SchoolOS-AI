import { Router } from 'express';
import { automationController } from './automation.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

// ── Public — called by n8n automation, no JWT ─────────────────────────────────
router.post('/webhook', automationController.webhookCallback);

// ── Admin-only — all other automation management routes ───────────────────────
router.use(authenticate);
router.use(authorize('admin'));

router.get('/jobs', automationController.list);
router.get('/jobs/:id', automationController.getById);
router.patch('/jobs/:id/cancel', automationController.cancel);
router.post('/jobs/:id/retry', automationController.retry);

export default router;
