import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

router.get('/me', notificationController.list);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.post('/broadcast', authorize('admin'), notificationController.broadcastToTeachers);

export default router;
