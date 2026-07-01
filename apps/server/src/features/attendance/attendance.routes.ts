import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { attendanceController } from './attendance.controller';

const router = Router();

router.use(authenticate);

// Static routes first — must come before /:id to avoid param conflicts
router.post('/bulk',                             attendanceController.bulkMark);
router.get('/summary',                           attendanceController.getSummary);
router.get('/class/:class/:section',             attendanceController.getClassAttendance);
router.get('/student/:studentId',                attendanceController.getStudentHistory);

// Generic resource routes
router.post('/',                                 attendanceController.markSingle);
router.get('/',                                  attendanceController.list);
router.get('/:id',                               attendanceController.getById);
router.patch('/:id',                             attendanceController.update);
router.delete('/:id', authorize('admin'),        attendanceController.deleteRecord);

export default router;
