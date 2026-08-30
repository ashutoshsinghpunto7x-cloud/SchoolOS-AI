import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { imageUploadMiddleware } from '../../lib/image-upload';
import { eventController } from './event.controller';

const router = Router();
router.use(authenticate);

// Static routes before /:id
router.get('/upcoming', eventController.getUpcoming);

// Generic resource routes — anyone can view; creating/editing events is
// admin + principal only (matches the frontend route gate in routes/index.tsx).
const canManageEvents = authorize('admin', 'principal');
router.post('/',              canManageEvents, eventController.create);
router.get('/',               eventController.list);
router.get('/:id',            eventController.getById);
router.patch('/:id/status',   canManageEvents, eventController.updateStatus);
router.patch('/:id',          canManageEvents, eventController.update);
router.post('/:id/attachment', canManageEvents, imageUploadMiddleware, eventController.uploadAttachment);
router.delete('/:id/attachment', canManageEvents, eventController.removeAttachment);
router.delete('/:id', authorize('admin'), eventController.deleteEvent);

// Read receipts
router.post('/:id/read',              eventController.markRead);
router.get('/:id/read-receipts', authorize('admin'), eventController.getReadReceipts);

export default router;
