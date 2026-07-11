import { Router } from 'express';
import { teacherTimetableController } from './teacher-timetable.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

// ── Teacher's own view (static before /:teacherId) ─────────────────────────
router.get('/me', authorize('teacher'), teacherTimetableController.getMine);

// ── Principal/Admin builder ─────────────────────────────────────────────────
router.post('/',                    authorize('admin', 'principal'), teacherTimetableController.getOrCreate);
router.get('/teacher/:teacherId',   authorize('admin', 'principal'), teacherTimetableController.getForTeacher);
router.get('/:id',                  authorize('admin', 'principal'), teacherTimetableController.getById);
router.put('/:id/entries',          authorize('admin', 'principal'), teacherTimetableController.bulkUpdateEntries);
router.patch('/:id/status',         authorize('admin', 'principal'), teacherTimetableController.updateStatus);
router.delete('/:id',               authorize('admin', 'principal'), teacherTimetableController.deleteTimetable);

export default router;
