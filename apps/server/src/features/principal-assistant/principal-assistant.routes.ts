import { Router } from 'express';
import { principalAssistantController } from './principal-assistant.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'principal'));

router.post('/chat', principalAssistantController.chat);
router.post('/action/preview', principalAssistantController.previewAction);
router.post('/action/execute', principalAssistantController.executeAction);

export default router;
