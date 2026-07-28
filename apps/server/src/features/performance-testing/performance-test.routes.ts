import { Router } from 'express';
import { performanceTestController } from './performance-test.controller';
import { authenticate } from '../../middlewares/authenticate';
import { permit } from '../../middlewares/permit';
import { PERMISSIONS } from '../../lib/permissions';

const router = Router();

router.use(authenticate);
router.use(permit(PERMISSIONS.OPS_VIEW));

router.post('/start', performanceTestController.start);
router.post('/:runId/stop', performanceTestController.stop);
router.get('/live', performanceTestController.live);
router.get('/', performanceTestController.list);
router.get('/:runId', performanceTestController.detail);
router.get('/:runId/report.json', performanceTestController.reportJson);
router.get('/:runId/report.csv', performanceTestController.reportCsv);

export default router;
