import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { collectionScheduleController } from './collection-schedule.controller';

const router = Router();

router.use(authenticate);

router.get('/', collectionScheduleController.list);
router.post('/', authorize('admin', 'principal', 'accountant'), collectionScheduleController.upsert);
router.post('/use-default', authorize('admin', 'principal', 'accountant'), collectionScheduleController.useDefaultSchedule);
router.delete('/:depositMonth', authorize('admin', 'principal', 'accountant'), collectionScheduleController.remove);

export default router;
