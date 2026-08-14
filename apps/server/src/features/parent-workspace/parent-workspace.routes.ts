import { Router } from 'express';
import { parentWorkspaceController } from './parent-workspace.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('parent'));

router.get('/', parentWorkspaceController.getWorkspace);
router.post('/ai/ask', parentWorkspaceController.askAI);

export default router;
