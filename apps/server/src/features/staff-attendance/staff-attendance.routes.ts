import { Router } from 'express';
import { staffAttendanceController } from './staff-attendance.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

// ── Static routes first (must precede /employee/:employeeId) ─────────────────
// operations_manager reuses this same staff-attendance mechanism (Operations
// & Administration Dashboard) rather than a bespoke screen — see
// project_operations_admin_dashboard memory.
router.post('/scan',   authorize('admin', 'principal', 'operations_manager'), staffAttendanceController.scan);
router.post('/manual', authorize('admin', 'principal', 'operations_manager'), staffAttendanceController.markManual);
router.get('/today',   authorize('admin', 'principal', 'operations_manager'), staffAttendanceController.today);

// A teacher may fetch only their own history — enforced in the controller.
router.get('/employee/:employeeId', authorize('admin', 'principal', 'operations_manager', 'teacher'), staffAttendanceController.forEmployee);

export default router;
