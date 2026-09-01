import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { interviewController } from './interview.controller';

const router = Router();
router.use(authenticate);

// Scheduling/rescheduling/cancelling is a Principal/HR call (§4 permissions
// matrix: reception gets calendar visibility only, to greet arriving
// candidates — not scheduling rights).
const canManage = authorize('admin', 'principal');
// Any authenticated staff member can view interviews (reception needs to see
// today's schedule) and submit feedback if they were assigned as an
// interviewer — feedback ownership itself is enforced in the service layer
// (one submission per interviewer, keyed off the caller's own userId).
const canView = authorize('admin', 'principal', 'reception', 'teacher', 'accountant');

router.post('/',                     canManage, interviewController.schedule);
router.get('/',                      canView,   interviewController.list);
router.get('/by-candidate/:candidateId', canView, interviewController.getByCandidate);
router.get('/:id',                   canView,   interviewController.getById);
router.patch('/:id/status',          canManage, interviewController.setStatus);
router.patch('/:id/reschedule',      canManage, interviewController.reschedule);
router.post('/:id/feedback',         canView,   interviewController.submitFeedback);
router.delete('/:id', authorize('admin'), interviewController.deleteInterview);

export default router;
