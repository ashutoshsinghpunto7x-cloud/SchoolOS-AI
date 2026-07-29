import { Router } from 'express';
import { teacherController } from './teacher.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { imageUploadMiddleware } from '../../lib/image-upload';

const router = Router();

router.use(authenticate);

// ── Teacher CRUD ──────────────────────────────────────────────────────────────
// Accountant can import/view teachers and, from the Teacher Directory, edit
// profile fields too (needed to keep records current and export accurately) —
// employment-status changes and account creation/deletion stay Principal/Admin/Reception.
router.post('/',   authorize('admin', 'principal', 'reception'), teacherController.create);
router.get('/',    teacherController.list);
router.get('/search', teacherController.search);       // lightweight autocomplete
router.get('/login-status', authorize('admin'), teacherController.listLoginStatus); // must precede /:id
router.get('/:id', teacherController.getById);
router.patch('/:id', authorize('admin', 'principal', 'reception', 'accountant'), teacherController.update);
router.post('/:id/photo',   authorize('admin', 'reception', 'accountant'), imageUploadMiddleware, teacherController.uploadPhoto);
router.delete('/:id/photo', authorize('admin', 'reception', 'accountant'), teacherController.removePhoto);
router.patch('/:id/status',    authorize('admin', 'principal', 'reception'), teacherController.changeStatus);
router.patch('/:id/link-user', authorize('admin'), teacherController.linkUserAccount);
router.post('/:id/login',      authorize('admin'), teacherController.createLogin);
router.delete('/:id',          authorize('admin'), teacherController.deleteTeacher);

// ── Teacher Notes ─────────────────────────────────────────────────────────────
// HR/disciplinary notes about a teacher — same admin/principal/reception bar
// as profile edits. Without this, any teacher account could read or tamper
// with notes written about ANY teacher (including notes about themselves).
const canAccessTeacherNotes = authorize('admin', 'principal', 'reception');
router.get('/:id/notes',              canAccessTeacherNotes, teacherController.listNotes);
router.post('/:id/notes',             canAccessTeacherNotes, teacherController.createNote);
router.patch('/:id/notes/:noteId',    canAccessTeacherNotes, teacherController.updateNote);
router.delete('/:id/notes/:noteId',   canAccessTeacherNotes, teacherController.deleteNote);

export default router;
