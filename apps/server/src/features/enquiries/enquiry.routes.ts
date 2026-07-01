import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { enquiryController } from './enquiry.controller';

const router = Router();
router.use(authenticate);

// ── Static routes before /:id ──────────────────────────────────────────────────
router.get('/stage-counts', enquiryController.getStageCounts);

// ── Generic enquiry routes ─────────────────────────────────────────────────────
router.post('/',  enquiryController.create);
router.get('/',   enquiryController.list);
router.get('/:id',  enquiryController.getById);
router.patch('/:id',           enquiryController.update);
router.patch('/:id/stage',     enquiryController.updateStage);
router.post('/:id/convert',    enquiryController.convert);
router.delete('/:id', authorize('admin'), enquiryController.deleteEnquiry);

// ── Notes sub-resource ─────────────────────────────────────────────────────────
router.get('/:id/notes',               enquiryController.listNotes);
router.post('/:id/notes',              enquiryController.createNote);
router.patch('/:id/notes/:noteId',     enquiryController.updateNote);
router.delete('/:id/notes/:noteId',    enquiryController.deleteNote);

export default router;
