import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { importController, uploadMiddleware } from './import.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'accountant'));

// Templates (no session required)
router.get('/templates', importController.listTemplates);
router.get('/templates/:type/download', importController.downloadTemplate);

// Session lifecycle
router.post('/sessions', uploadMiddleware, importController.upload);
router.get('/sessions', importController.list);
router.get('/sessions/:id', importController.getById);
router.get('/sessions/:id/rows', importController.getRows);
router.patch('/sessions/:id/mapping', importController.updateMapping);
router.post('/sessions/:id/confirm', importController.confirm);
router.post('/sessions/:id/cancel', importController.cancel);
router.post('/sessions/:id/rollback', importController.rollback);

export default router;
