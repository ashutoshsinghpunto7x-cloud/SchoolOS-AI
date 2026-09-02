import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { academicPlanController } from './academic-plan.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'principal', 'teacher', 'academic_coordinator'));

// Principal/admin/coordinator read-only views — static routes before /:id to avoid param conflicts.
const canViewPrincipalPlan = authorize('admin', 'principal', 'academic_coordinator');
router.get('/principal/overview',   canViewPrincipalPlan, academicPlanController.getPrincipalOverview);
router.get('/principal/:teacherId', canViewPrincipalPlan, academicPlanController.getForTeacher);

// Plan Alerts — same viewer roles as the principal overview; only admin can
// force a manual detection run (used for verification, not routine use —
// the nightly job at plan-alert.job.ts is the normal trigger).
router.get('/alerts',              canViewPrincipalPlan, academicPlanController.listAlerts);
router.patch('/alerts/:id/resolve', canViewPrincipalPlan, academicPlanController.resolveAlert);
router.post('/alerts/run',          authorize('admin'),   academicPlanController.runAlertDetection);

router.patch('/chapters/:id/sizing', academicPlanController.updateChapterSizing);

router.post('/generate', academicPlanController.generate);
router.get('/mine',      academicPlanController.getMine);
router.patch('/:id/days', academicPlanController.setDayStatus);
router.patch('/:id/days/edit', academicPlanController.editDay);
router.patch('/:id/days/move', academicPlanController.moveDay);

export default router;
