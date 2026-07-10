import { Router } from 'express';
import { leaveRequestController } from './leave-request.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

router.post('/', leaveRequestController.create);
router.get('/mine', leaveRequestController.listMine);
router.get('/pending', authorize('admin', 'principal'), leaveRequestController.listPending);
router.get('/:id', leaveRequestController.getById);
router.patch('/:id/approve', authorize('admin', 'principal'), leaveRequestController.approve);
router.patch('/:id/reject', authorize('admin', 'principal'), leaveRequestController.reject);

export default router;
