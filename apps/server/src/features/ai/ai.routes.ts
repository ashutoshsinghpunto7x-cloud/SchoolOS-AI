import { Router } from 'express';
import { aiController } from './ai.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

// ── Public — Vapi webhook (no auth, validated by secret) ─────────────────────
router.post('/webhook/vapi', aiController.vapiWebhook);

// ── Protected ────────────────────────────────────────────────────────────────
router.use(authenticate);

// Any authenticated user can fetch the AI conversation for a communication
// (they already have access to the communication itself)
router.get('/conversations/:communicationId', aiController.getConversation);

// Admin-only status check
router.get('/status', authorize('admin'), aiController.status);

export default router;
