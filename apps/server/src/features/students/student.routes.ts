import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { studentController } from './student.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { ForbiddenError } from '../../middlewares/errorHandler';
import { imageUploadMiddleware } from '../../lib/image-upload';
import { quickImportUpload, studentQuickImportController } from './student.quick-import';

const router = Router();

router.use(authenticate);

// admin/reception/accountant may add a student to any class. Teachers may
// add students too, but only to a class/section they are the assigned class
// teacher for — enforced inside studentService.createStudent
// (assertTeacherCanManageClass), not here, since it needs a DB lookup keyed
// off the class/section in the request body.
function authorizeStudentCreate(req: Request, _res: Response, next: NextFunction): void {
  const role = req.user?.role;
  if (role === 'admin' || role === 'reception' || role === 'accountant' || role === 'teacher') { next(); return; }
  next(new ForbiddenError('Only admin, reception, accountant, or a class teacher can add students.'));
}

// ── Student CRUD ──────────────────────────────────────────────────────────────
router.post('/', authorizeStudentCreate, studentController.create);
router.post('/quick-import', quickImportUpload, studentQuickImportController.run);
router.get('/', studentController.list);
router.get('/search', studentController.search);         // lightweight autocomplete
router.get('/:id', studentController.getById);
// Low-risk field any role (incl. teacher) can quick-edit directly, exempt from the
// change-request approval flow that gates the broader update below.
router.patch('/:id/roll-number', studentController.updateRollNumber);
// Same quick-edit exemption for name typo fixes, but scoped server-side (see
// studentService.updateStudentName / assertTeacherCanManageClass) to the
// teacher's own assigned class — name is more sensitive than roll number.
router.patch('/:id/name', studentController.updateName);
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
