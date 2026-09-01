import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { followUpController } from './follow-up.controller';

const router = Router();
router.use(authenticate);

// Same admission-pipeline roles as enquiries (follow-ups are always tied to
// one) — see enquiry.routes.ts for the rationale.
const canAccessFollowUps = authorize('admin', 'principal', 'reception');

router.post('/',                  canAccessFollowUps, followUpController.create);
router.get('/',                   canAccessFollowUps, followUpController.list);
router.get('/:id',                canAccessFollowUps, followUpController.getById);
router.patch('/:id/complete',     canAccessFollowUps, followUpController.complete);
router.patch('/:id/reschedule',   canAccessFollowUps, followUpController.reschedule);
router.delete('/:id', authorize('admin'), followUpController.deleteFollowUp);

export default router;
