import { Router } from 'express';
import { studentChangeRequestController } from './student-change-request.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

router.post('/', studentChangeRequestController.create);
router.get('/', authorize('admin'), studentChangeRequestController.listPending);
router.patch('/:id/approve', authorize('admin'), studentChangeRequestController.approve);
router.patch('/:id/reject', authorize('admin'), studentChangeRequestController.reject);

export default router;
