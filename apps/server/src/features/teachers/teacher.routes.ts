import { Router } from 'express';
import { teacherController } from './teacher.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

// ── Teacher CRUD ──────────────────────────────────────────────────────────────
router.post('/',   teacherController.create);
router.get('/',    teacherController.list);
router.get('/search', teacherController.search);       // lightweight autocomplete
router.get('/:id', teacherController.getById);
router.patch('/:id', teacherController.update);
router.patch('/:id/status',    teacherController.changeStatus);
router.patch('/:id/link-user', authorize('admin'), teacherController.linkUserAccount);
router.delete('/:id',          authorize('admin'), teacherController.deleteTeacher);

// ── Teacher Notes ─────────────────────────────────────────────────────────────
router.get('/:id/notes',              teacherController.listNotes);
router.post('/:id/notes',             teacherController.createNote);
router.patch('/:id/notes/:noteId',    teacherController.updateNote);
router.delete('/:id/notes/:noteId',   teacherController.deleteNote);

export default router;
