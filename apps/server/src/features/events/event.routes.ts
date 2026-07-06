import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { eventController } from './event.controller';

const router = Router();
router.use(authenticate);

// Static routes before /:id
router.get('/upcoming', eventController.getUpcoming);

// Generic resource routes
router.post('/',              eventController.create);
router.get('/',               eventController.list);
router.get('/:id',            eventController.getById);
router.patch('/:id/status',   eventController.updateStatus);
router.patch('/:id',          eventController.update);
router.delete('/:id', authorize('admin'), eventController.deleteEvent);

// Read receipts
router.post('/:id/read',              eventController.markRead);
router.get('/:id/read-receipts', authorize('admin'), eventController.getReadReceipts);

export default router;
