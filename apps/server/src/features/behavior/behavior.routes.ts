import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { behaviorController } from './behavior.controller';

const router = Router();

router.use(authenticate);

// Static routes first — must come before /:id to avoid param conflicts
router.get('/window',                            behaviorController.getWindowStatus);
router.get('/options',                           behaviorController.listOptions);
router.post('/options',                          behaviorController.createOption);
router.patch('/options/:id',                     behaviorController.updateOption);
router.post('/bulk',                             behaviorController.bulkMark);
router.get('/class/:class/:section',             behaviorController.getClassRecords);
router.get('/student/:studentId',                behaviorController.getStudentHistory);

// Generic resource routes
router.post('/',                                 behaviorController.markSingle);
router.delete('/:id', authorize('admin', 'principal'), behaviorController.deleteRecord);

export default router;
