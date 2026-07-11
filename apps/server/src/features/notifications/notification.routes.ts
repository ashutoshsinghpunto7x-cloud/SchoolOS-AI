import { Router } from 'express';
import { notificationController } from './notification.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

router.get('/me', notificationController.list);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.patch('/:id/call-status', notificationController.updateCallStatus);
router.post('/broadcast', authorize('admin'), notificationController.broadcastToTeachers);
// Single-notification fetch (full-page detail view) — must stay after the
// literal /me and /read-all routes above so it doesn't shadow them.
router.get('/:id', notificationController.getById);

export default router;
