import { Router } from 'express';
import { teacherController } from './teacher.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { imageUploadMiddleware } from '../../lib/image-upload';

const router = Router();

router.use(authenticate);

// ── Teacher CRUD ──────────────────────────────────────────────────────────────
// Accountant can import/view teachers (and, per spec, upload photos) but cannot
// create/edit teacher profile data or change employment status — that's
// Principal/Admin (and Reception, which already manages basic staff records).
router.post('/',   authorize('admin', 'principal', 'reception'), teacherController.create);
router.get('/',    teacherController.list);
router.get('/search', teacherController.search);       // lightweight autocomplete
router.get('/:id', teacherController.getById);
router.patch('/:id', authorize('admin', 'principal', 'reception'), teacherController.update);
router.post('/:id/photo',   authorize('admin', 'reception', 'accountant'), imageUploadMiddleware, teacherController.uploadPhoto);
router.delete('/:id/photo', authorize('admin', 'reception', 'accountant'), teacherController.removePhoto);
router.patch('/:id/status',    authorize('admin', 'principal', 'reception'), teacherController.changeStatus);
router.patch('/:id/link-user', authorize('admin'), teacherController.linkUserAccount);
router.delete('/:id',          authorize('admin'), teacherController.deleteTeacher);

// ── Teacher Notes ─────────────────────────────────────────────────────────────
router.get('/:id/notes',              teacherController.listNotes);
router.post('/:id/notes',             teacherController.createNote);
router.patch('/:id/notes/:noteId',    teacherController.updateNote);
router.delete('/:id/notes/:noteId',   teacherController.deleteNote);

export default router;
