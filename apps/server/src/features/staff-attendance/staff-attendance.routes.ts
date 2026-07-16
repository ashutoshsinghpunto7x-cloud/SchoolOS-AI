import { Router } from 'express';
import { staffAttendanceController } from './staff-attendance.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

// ── Static routes first (must precede /employee/:employeeId) ─────────────────
router.post('/scan',  authorize('admin', 'principal'), staffAttendanceController.scan);
router.get('/today',  authorize('admin', 'principal'), staffAttendanceController.today);

// A teacher may fetch only their own history — enforced in the controller.
router.get('/employee/:employeeId', authorize('admin', 'principal', 'teacher'), staffAttendanceController.forEmployee);

export default router;
