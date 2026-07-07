import { Router } from 'express';
import { teacherWorkspaceController } from './teacher-workspace.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('teacher'));

router.get('/me', teacherWorkspaceController.getMe);

export default router;
