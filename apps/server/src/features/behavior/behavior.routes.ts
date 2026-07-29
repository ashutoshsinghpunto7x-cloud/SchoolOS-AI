import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { behaviorController } from './behavior.controller';

const router = Router();

router.use(authenticate);

// Only teaching/leadership roles touch behaviour records — reception/accountant
// have no legitimate reason to read or write them. Per-record ownership (a
// teacher may only mark/view classes they're the class teacher of or teach a
// subject in) is enforced in behavior.service.ts via assertTeacherCanRecordBehavior.
const canAccessBehavior = authorize('admin', 'principal', 'teacher');

// Static routes first — must come before /:id to avoid param conflicts
router.get('/window',                            behaviorController.getWindowStatus);
router.get('/options',                           behaviorController.listOptions);
// Teachers add ad-hoc categories from the marking UI itself; only editing an
// existing (possibly shared) category is reserved for leadership.
router.post('/options',        canAccessBehavior, behaviorController.createOption);
router.patch('/options/:id',   authorize('admin', 'principal'), behaviorController.updateOption);
router.post('/bulk',                             canAccessBehavior, behaviorController.bulkMark);
router.get('/class/:class/:section',             canAccessBehavior, behaviorController.getClassRecords);
router.get('/student/:studentId',                canAccessBehavior, behaviorController.getStudentHistory);

// Generic resource routes
router.post('/',                                 canAccessBehavior, behaviorController.markSingle);
router.delete('/:id', authorize('admin', 'principal'), behaviorController.deleteRecord);

export default router;
