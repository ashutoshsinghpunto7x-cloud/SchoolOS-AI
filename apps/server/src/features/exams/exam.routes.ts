import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { examController } from './exam.controller';

const router = Router();

router.use(authenticate);

// Static routes first — must come before /:id to avoid param conflicts
router.get('/class/:class', examController.listForClass);

// Generic resource routes — academic_coordinator can configure exams (dates,
// revision lead, etc. — see the Academic Planning Engine) but not delete
// them; deletion stays admin/principal only.
router.post('/',                                          authorize('admin', 'principal', 'academic_coordinator'), examController.create);
router.get('/',                                            examController.list);
router.get('/:id',                                         examController.getById);
router.patch('/:id',                                       authorize('admin', 'principal', 'academic_coordinator'), examController.update);
router.patch('/:id/status',                                authorize('admin', 'principal', 'academic_coordinator'), examController.updateStatus);
router.delete('/:id',                                      authorize('admin', 'principal'), examController.deleteExam);

export default router;
