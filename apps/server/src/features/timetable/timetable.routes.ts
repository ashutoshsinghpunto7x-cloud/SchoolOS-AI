import { Router } from 'express';
import { timetableController } from './timetable.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

// ── Period slots (static prefix, admin-managed) ────────────────────────────
router.get('/periods',               timetableController.listPeriodSlots);
// Teachers may create new period slots (e.g. when the seeded set doesn't cover their day),
// but reorder/update/delete stay admin-only since those mutate shared periods every class relies on.
router.post('/periods', authorize('admin', 'principal', 'teacher'), timetableController.createPeriodSlot);
router.patch('/periods/reorder', authorize('admin', 'principal'), timetableController.reorderPeriodSlots);
router.patch('/periods/:slotId', authorize('admin', 'principal'), timetableController.updatePeriodSlot);
router.delete('/periods/:slotId', authorize('admin', 'principal'), timetableController.deletePeriodSlot);

// ── Conflict detection (static before /:id) ────────────────────────────────
router.get('/conflicts', timetableController.detectConflicts);

// ── Teacher schedule (static before /:id) ─────────────────────────────────
router.get('/teacher/:teacherId', timetableController.getTeacherSchedule);

// ── Substitutes ────────────────────────────────────────────────────────────
router.get('/substitutes/needed',           timetableController.getNeedsSubstitute);
router.get('/substitutes/suggest-teachers', timetableController.suggestSubstituteTeachers);
router.get('/substitutes',          timetableController.listSubstitutes);
router.post('/substitutes',         timetableController.createSubstitute);
router.patch('/substitutes/:subId', timetableController.updateSubstitute);
router.delete('/substitutes/:subId', authorize('admin', 'principal'), timetableController.deleteSubstitute);

// ── Timetables ─────────────────────────────────────────────────────────────
router.post('/', authorize('admin', 'principal'), timetableController.create);
router.get('/',                      timetableController.list);
router.get('/:id',                   timetableController.getById);
router.patch('/:id',        authorize('admin', 'principal'), timetableController.update);
router.patch('/:id/entry',  authorize('admin', 'principal'), timetableController.upsertEntry);
router.delete('/:id/entry', authorize('admin', 'principal'), timetableController.removeEntry);
router.put('/:id/entries',  authorize('admin', 'principal'), timetableController.bulkUpdateEntries);
router.patch('/:id/status', authorize('admin', 'principal'), timetableController.updateStatus);
router.delete('/:id',       authorize('admin', 'principal'), timetableController.deleteTimetable);

export default router;
