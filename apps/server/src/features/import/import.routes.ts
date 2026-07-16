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

// Named mapping templates
router.get('/mapping-templates', importController.listMappingTemplates);
router.delete('/mapping-templates/:id', importController.deleteMappingTemplate);

// Session lifecycle
router.post('/sessions', uploadMiddleware, importController.upload);
router.get('/sessions', importController.list);
router.get('/sessions/:id', importController.getById);
router.get('/sessions/:id/rows', importController.getRows);
router.get('/sessions/:id/errors/download', importController.downloadErrors);
router.post('/sessions/:id/rows', importController.addRow);
router.patch('/sessions/:id/rows/:rowNumber', importController.updateRow);
router.delete('/sessions/:id/rows/:rowNumber', importController.deleteRow);
router.patch('/sessions/:id/mapping', importController.updateMapping);
router.patch('/sessions/:id/duplicates', importController.setDuplicateStrategy);
router.post('/sessions/:id/ai-map', importController.aiMap);
router.post('/sessions/:id/save-mapping-template', importController.saveMappingTemplate);
router.post('/sessions/:id/confirm', importController.confirm);
router.post('/sessions/:id/cancel', importController.cancel);
router.post('/sessions/:id/rollback', importController.rollback);

export default router;
