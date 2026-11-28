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

// Voice/chat editing — teachers change their own plan, principals any plan in the school.
const canUseAssistant = authorize('admin', 'principal', 'teacher');
router.post('/assistant/interpret', canUseAssistant, academicPlanController.assistantInterpret);
router.post('/assistant/apply',     canUseAssistant, academicPlanController.assistantApply);

router.post('/generate', academicPlanController.generate);
router.get('/mine',      academicPlanController.getMine);
router.get('/mine/checklist', academicPlanController.getMyChecklist);
router.patch('/:id/days', academicPlanController.setDayStatus);
router.patch('/:id/days/bulk', academicPlanController.setDaysStatus);
router.patch('/:id/monthly', academicPlanController.setMonthlyRow);
router.post('/:id/days/add', academicPlanController.addDay);
router.patch('/:id/days/edit', academicPlanController.editDay);
router.patch('/:id/days/move', academicPlanController.moveDay);

export default router;
