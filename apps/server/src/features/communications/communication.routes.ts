import { Router } from 'express';
import { communicationController } from './communication.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

// ── Public — called by n8n automation, no JWT ─────────────────────────────────
router.post('/webhook', communicationController.webhookCallback);

// ── All other routes require authentication ───────────────────────────────────
router.use(authenticate);

// Front-desk/leadership only — this is guardian phone-call/WhatsApp/note
// logging, not an academic feature; teachers/accountants have no reason to
// trigger outbound contact or read the school's communication history.
const canAccessCommunications = authorize('admin', 'principal', 'reception');

router.get('/', canAccessCommunications, communicationController.list);
router.get('/student/:studentId', canAccessCommunications, communicationController.listByStudent);
router.get('/:id', canAccessCommunications, communicationController.getById);

router.post('/call', canAccessCommunications, communicationController.initiateCall);
router.post('/note', canAccessCommunications, communicationController.createNote);
router.post('/whatsapp', canAccessCommunications, communicationController.sendWhatsApp);

router.patch('/:id', canAccessCommunications, communicationController.update);

export default router;
