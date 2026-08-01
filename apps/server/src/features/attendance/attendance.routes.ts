import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { attendanceController } from './attendance.controller';

const router = Router();

router.use(authenticate);

// Writes are restricted to teaching/leadership roles — reception/accountant
// have no legitimate reason to mark or edit attendance (data-integrity
// concern). Reads stay open to every authenticated role, matching the
// existing accountant/reception "view a class's attendance" reporting
// feature; per-teacher ownership (a teacher may only mark/view their OWN
// assigned class) is enforced inside attendance.service.ts via
// assertTeacherCanMarkClass, which no-ops for non-teacher roles.
const canWriteAttendance = authorize('admin', 'principal', 'teacher');

// Static routes first — must come before /:id to avoid param conflicts
router.post('/bulk',                             canWriteAttendance, attendanceController.bulkMark);
router.get('/summary',                           attendanceController.getSummary);
router.get('/class-overview',                    attendanceController.getClassOverview);
router.get('/teacher-overview',                  attendanceController.getTeacherOverview);
router.get('/class/:class/:section',             attendanceController.getClassAttendance);
router.get('/student/:studentId',                attendanceController.getStudentHistory);

// Generic resource routes
router.post('/',                                 canWriteAttendance, attendanceController.markSingle);
router.get('/',                                  attendanceController.list);
router.get('/:id',                               attendanceController.getById);
router.patch('/:id',                             canWriteAttendance, attendanceController.update);
router.delete('/:id', authorize('admin'),        attendanceController.deleteRecord);

export default router;
