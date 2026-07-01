import { Router } from 'express';
import { timetableController } from './timetable.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

// ── Period slots (static prefix, admin-managed) ────────────────────────────
router.get('/periods',               timetableController.listPeriodSlots);
router.post('/periods', authorize('admin'), timetableController.createPeriodSlot);
router.patch('/periods/reorder', authorize('admin'), timetableController.reorderPeriodSlots);
router.patch('/periods/:slotId', authorize('admin'), timetableController.updatePeriodSlot);
router.delete('/periods/:slotId', authorize('admin'), timetableController.deletePeriodSlot);

// ── Conflict detection (static before /:id) ────────────────────────────────
router.get('/conflicts', timetableController.detectConflicts);

// ── Teacher schedule (static before /:id) ─────────────────────────────────
router.get('/teacher/:teacherId', timetableController.getTeacherSchedule);

// ── Substitutes ────────────────────────────────────────────────────────────
router.get('/substitutes',          timetableController.listSubstitutes);
router.post('/substitutes',         timetableController.createSubstitute);
router.patch('/substitutes/:subId', timetableController.updateSubstitute);
router.delete('/substitutes/:subId', authorize('admin'), timetableController.deleteSubstitute);

// ── Timetables ─────────────────────────────────────────────────────────────
router.post('/', authorize('admin'), timetableController.create);
router.get('/',                      timetableController.list);
router.get('/:id',                   timetableController.getById);
router.patch('/:id',        authorize('admin'), timetableController.update);
router.patch('/:id/entry',  authorize('admin'), timetableController.upsertEntry);
router.delete('/:id/entry', authorize('admin'), timetableController.removeEntry);
router.put('/:id/entries',  authorize('admin'), timetableController.bulkUpdateEntries);
router.patch('/:id/status', authorize('admin'), timetableController.updateStatus);
router.delete('/:id',       authorize('admin'), timetableController.deleteTimetable);

export default router;
