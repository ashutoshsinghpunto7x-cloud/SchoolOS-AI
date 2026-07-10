import { Router } from 'express';
import { internalMessageController } from './internal-message.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

router.get('/me', internalMessageController.list);
router.get('/me/pending-acknowledgment', internalMessageController.pendingAcknowledgment);
router.patch('/:id/read', internalMessageController.markRead);
router.post('/:id/acknowledge', internalMessageController.acknowledge);

router.use(authorize('admin', 'principal'));

router.get('/staff-directory', internalMessageController.staffDirectory);
router.get('/sent', internalMessageController.listSent);
router.post('/send', internalMessageController.send);
router.get('/templates', internalMessageController.listTemplates);
router.post('/templates', internalMessageController.createTemplate);
router.delete('/templates/:id', internalMessageController.deleteTemplate);

export default router;
