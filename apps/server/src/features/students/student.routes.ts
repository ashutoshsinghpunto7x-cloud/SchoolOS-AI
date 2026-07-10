import { Router } from 'express';
import { studentController } from './student.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { imageUploadMiddleware } from '../../lib/image-upload';
import { quickImportUpload, studentQuickImportController } from './student.quick-import';

const router = Router();

router.use(authenticate);

// ── Student CRUD ──────────────────────────────────────────────────────────────
router.post('/', studentController.create);
router.post('/quick-import', quickImportUpload, studentQuickImportController.run);
router.get('/', studentController.list);
router.get('/search', studentController.search);         // lightweight autocomplete
router.get('/:id', studentController.getById);
// Low-risk field any role (incl. teacher) can quick-edit directly, exempt from the
// change-request approval flow that gates the broader update below.
router.patch('/:id/roll-number', studentController.updateRollNumber);
router.patch('/:id/fee-profile', authorize('admin', 'reception', 'accountant'), studentController.updateFeeProfile);
router.post('/:id/photo', authorize('admin', 'reception', 'accountant', 'teacher'), imageUploadMiddleware, studentController.uploadPhoto);
router.delete('/:id/photo', authorize('admin', 'reception', 'accountant', 'teacher'), studentController.removePhoto);
router.patch('/:id', authorize('admin', 'reception', 'accountant'), studentController.update);
router.patch('/:id/status', studentController.changeStatus);
router.delete('/:id', authorize('admin'), studentController.deleteStudent);

// ── Student Notes ─────────────────────────────────────────────────────────────
router.get('/:id/notes', studentController.listNotes);
router.post('/:id/notes', studentController.createNote);
router.patch('/:id/notes/:noteId', studentController.updateNote);
router.delete('/:id/notes/:noteId', studentController.deleteNote);

export default router;
