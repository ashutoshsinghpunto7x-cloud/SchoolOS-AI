import { Router } from 'express';
import { principalController } from './principal.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'principal'));

router.get('/dashboard', principalController.getDashboard);
router.get('/teachers-summary', principalController.getTeachersSummary);

export default router;
