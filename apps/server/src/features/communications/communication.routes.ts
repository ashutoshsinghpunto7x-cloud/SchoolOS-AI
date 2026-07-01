import { Router } from 'express';
import { communicationController } from './communication.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

// ── Public — called by n8n automation, no JWT ─────────────────────────────────
router.post('/webhook', communicationController.webhookCallback);

// ── All other routes require authentication ───────────────────────────────────
router.use(authenticate);

router.get('/', communicationController.list);
router.get('/student/:studentId', communicationController.listByStudent);
router.get('/:id', communicationController.getById);

router.post('/call', communicationController.initiateCall);
router.post('/note', communicationController.createNote);
router.post('/whatsapp', communicationController.sendWhatsApp);

router.patch('/:id', communicationController.update);

export default router;
