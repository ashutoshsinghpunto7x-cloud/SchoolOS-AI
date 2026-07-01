import { Router } from 'express';
import { accountantWorkspaceController } from './accountant-workspace.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('accountant', 'admin'));

router.get('/dashboard', accountantWorkspaceController.getDashboard);
router.get('/defaulters/grouped', accountantWorkspaceController.getGroupedDefaulters);
router.post('/defaulters/send-to-teacher', accountantWorkspaceController.sendDefaultersToTeacher);
router.post('/receipts/send-email', accountantWorkspaceController.sendReceiptEmail);

export default router;
