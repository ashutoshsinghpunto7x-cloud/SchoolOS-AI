import { Router } from 'express';
import { communicationEngineController } from './communication-engine.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

// ── Public — Meta WhatsApp Cloud API webhook, no JWT ─────────────────────────
router.get('/webhook', communicationEngineController.verifyWebhook);
router.post('/webhook', communicationEngineController.receiveWebhook);

// ── All other routes require authentication ──────────────────────────────────
router.use(authenticate);

// Attendance / Fees — teachers may trigger attendance notifications (they're the
// ones marking attendance); fee reminders are an accountant/admin/principal action.
router.post('/attendance/send', authorize('admin', 'principal', 'teacher'), communicationEngineController.sendAttendanceNotifications);
router.get('/attendance/send-status', communicationEngineController.getAttendanceSendStatus);
router.post('/fees/send', authorize('admin', 'principal', 'accountant'), communicationEngineController.sendFeeReminders);

// Broadcast
router.post('/broadcast/school', authorize('admin', 'principal'), communicationEngineController.broadcastSchool);
router.post('/broadcast/class', authorize('admin', 'principal'), communicationEngineController.broadcastClass);
router.post('/broadcast/section', authorize('admin', 'principal'), communicationEngineController.broadcastSection);
router.post('/broadcast/students', authorize('admin', 'principal', 'teacher'), communicationEngineController.broadcastStudents);
router.post('/broadcast/parents', authorize('admin', 'principal', 'teacher'), communicationEngineController.broadcastParents);
router.post('/broadcast/teachers', authorize('admin', 'principal'), communicationEngineController.broadcastTeachers);

// Logs
router.get('/logs', communicationEngineController.listLogs);
router.get('/logs/:id', communicationEngineController.getLog);
router.post('/logs/:id/retry', authorize('admin', 'principal', 'accountant'), communicationEngineController.retryLog);

// Bulk jobs
router.get('/jobs', communicationEngineController.listJobs);
router.get('/jobs/:id', communicationEngineController.getJob);

// Dashboard
router.get('/dashboard/summary', communicationEngineController.getDashboardSummary);
router.get('/dashboard/recent', communicationEngineController.getRecentActivity);
router.get('/dashboard/failed', communicationEngineController.getFailedNotifications);
router.post('/dashboard/retry-failed', authorize('admin', 'principal'), communicationEngineController.retryAllFailed);

// Templates
router.get('/templates', communicationEngineController.listTemplates);
router.post('/templates', authorize('admin', 'principal'), communicationEngineController.createTemplate);
router.patch('/templates/:id', authorize('admin', 'principal'), communicationEngineController.updateTemplate);
router.post('/templates/:id/activate', authorize('admin', 'principal'), communicationEngineController.activateTemplate);
router.delete('/templates/:id', authorize('admin', 'principal'), communicationEngineController.deleteTemplate);

export default router;
