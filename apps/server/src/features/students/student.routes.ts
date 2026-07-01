import { Router } from 'express';
import { studentController } from './student.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { quickImportUpload, studentQuickImportController } from './student.quick-import';

const router = Router();

router.use(authenticate);

// ── Student CRUD ──────────────────────────────────────────────────────────────
router.post('/', studentController.create);
router.post('/quick-import', quickImportUpload, studentQuickImportController.run);
router.get('/', studentController.list);
router.get('/search', studentController.search);         // lightweight autocomplete
router.get('/:id', studentController.getById);
router.patch('/:id', studentController.update);
router.patch('/:id/status', studentController.changeStatus);
router.delete('/:id', authorize('admin'), studentController.deleteStudent);

// ── Student Notes ─────────────────────────────────────────────────────────────
router.get('/:id/notes', studentController.listNotes);
router.post('/:id/notes', studentController.createNote);
router.patch('/:id/notes/:noteId', studentController.updateNote);
router.delete('/:id/notes/:noteId', studentController.deleteNote);

export default router;
