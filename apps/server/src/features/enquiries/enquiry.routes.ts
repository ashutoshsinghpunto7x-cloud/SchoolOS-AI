import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { enquiryController } from './enquiry.controller';

const router = Router();
router.use(authenticate);

// Admission-pipeline roles only — enquiries feed straight into student
// admission (`convert`), so a teacher account being able to create/edit/convert
// them would let it mint real student records outside the admissions process.
const canAccessEnquiries = authorize('admin', 'principal', 'reception');

// ── Static routes before /:id ──────────────────────────────────────────────────
router.get('/stage-counts', canAccessEnquiries, enquiryController.getStageCounts);

// ── Generic enquiry routes ─────────────────────────────────────────────────────
router.post('/',  canAccessEnquiries, enquiryController.create);
router.get('/',   canAccessEnquiries, enquiryController.list);
router.get('/:id',  canAccessEnquiries, enquiryController.getById);
router.patch('/:id',           canAccessEnquiries, enquiryController.update);
router.patch('/:id/stage',     canAccessEnquiries, enquiryController.updateStage);
router.post('/:id/convert',    canAccessEnquiries, enquiryController.convert);
router.delete('/:id', authorize('admin'), enquiryController.deleteEnquiry);

// ── Notes sub-resource ─────────────────────────────────────────────────────────
router.get('/:id/notes',               canAccessEnquiries, enquiryController.listNotes);
router.post('/:id/notes',              canAccessEnquiries, enquiryController.createNote);
router.patch('/:id/notes/:noteId',     canAccessEnquiries, enquiryController.updateNote);
router.delete('/:id/notes/:noteId',    canAccessEnquiries, enquiryController.deleteNote);

export default router;
