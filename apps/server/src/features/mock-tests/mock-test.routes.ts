import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { permit } from '../../middlewares/permit';
import { PERMISSIONS } from '../../lib/permissions';
import { mockTestController } from './mock-test.controller';

const router = Router();

router.use(authenticate);

// ── Parent / student (test-taking) — static prefix before /:id-style ops routes ──
const parent = Router();
parent.use(authorize('parent'));
parent.get('/', mockTestController.listForParent);
parent.get('/:id/take', mockTestController.getForTaking);
parent.post('/:id/submit', mockTestController.submit);
parent.get('/:id/leaderboard', mockTestController.leaderboard);
router.use('/parent', parent);

// ── Principal approval ────────────────────────────────────────────────────
const approvals = Router();
approvals.use(authorize('admin', 'principal'));
approvals.get('/pending', mockTestController.listPendingApprovals);
approvals.patch('/:id/approve', mockTestController.approve);
approvals.patch('/:id/reject', mockTestController.reject);
router.use('/approvals', approvals);

// ── Ops authoring — internal Test Engine screen, same role gate as the rest of Ops Center ──
router.use(permit(PERMISSIONS.OPS_VIEW));

router.post('/generate', mockTestController.generate);
router.get('/chapters', mockTestController.listChaptersForSchool);
router.post('/', mockTestController.create);
router.get('/', mockTestController.list);
router.get('/:id', mockTestController.getById);
router.patch('/:id', mockTestController.update);
router.post('/:id/submit-for-approval', mockTestController.submitForApproval);
router.get('/:id/leaderboard', mockTestController.leaderboardOps);

export default router;
