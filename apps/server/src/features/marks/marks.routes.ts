import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { marksController } from './marks.controller';

const router = Router();

router.use(authenticate);

// Static routes first — must come before /:id to avoid param conflicts
router.get('/entry-table',                                    marksController.getEntryTable);
router.get('/summary',                                        marksController.getSummary);
router.post('/bulk',                                          marksController.bulkUpsert);
router.post('/submit',                                        marksController.submitForReview);
router.post('/approve',           authorize('admin', 'principal'), marksController.approve);
router.post('/request-correction',authorize('admin', 'principal'), marksController.requestCorrection);
router.post('/publish',           authorize('admin', 'principal'), marksController.publish);
router.post('/lock',              authorize('admin', 'principal'), marksController.lock);
router.post('/reopen',            authorize('admin', 'principal'), marksController.reopen);

// Generic resource routes
router.post('/',                                              marksController.upsertSingle);
router.get('/',                                                marksController.list);
router.get('/:id',                                             marksController.getById);

export default router;
