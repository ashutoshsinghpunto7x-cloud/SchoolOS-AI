import { Router } from 'express';
import { studentChangeRequestController } from './student-change-request.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

// listPending/approve/reject were admin-only, but PendingApprovalsPage is a
// principal-only screen — principal was getting 403s trying to review the
// very requests it's supposed to approve. Both roles review now.
router.post('/', studentChangeRequestController.create);
router.get('/', authorize('admin', 'principal'), studentChangeRequestController.listPending);
// Any authenticated role may check whether one specific student has a
// pending request — scoped narrowly, unlike the school-wide list above.
router.get('/student/:studentId', studentChangeRequestController.listPendingForStudent);
router.patch('/:id/approve', authorize('admin', 'principal'), studentChangeRequestController.approve);
router.patch('/:id/reject', authorize('admin', 'principal'), studentChangeRequestController.reject);

export default router;
