import { Router } from 'express';
import { auditController } from './audit.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'principal', 'accountant'));

router.get('/', auditController.list);

export default router;
