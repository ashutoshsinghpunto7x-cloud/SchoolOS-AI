import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { aiImageUploadMiddleware, audioUploadMiddleware } from '../../lib/image-upload';
import { marksController } from './marks.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'principal', 'teacher'));

// Static routes first — must come before /:id to avoid param conflicts
router.get('/entry-table',                                    marksController.getEntryTable);
router.get('/summary',                                        marksController.getSummary);
router.post('/extract/image',     aiImageUploadMiddleware,    marksController.extractFromImage);
router.post('/extract/voice',     audioUploadMiddleware,      marksController.extractFromVoice);
router.get('/extract/jobs/:id',                               marksController.getExtractionJob);
router.post('/extract/transcript',                            marksController.extractFromTranscript);
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
