import { Router } from 'express';
import { featureFlagController } from './feature-flag.controller';
import { authenticate } from '../../middlewares/authenticate';
import { permit } from '../../middlewares/permit';
import { PERMISSIONS } from '../../lib/permissions';

// Ops Center management surface. Every route requires FEATURE_FLAGS_VIEW
// (all Ops roles); mutating routes additionally require FEATURE_FLAGS_MANAGE
// (owner/super_admin only) — "Developers can only view feature status."
const router = Router();
const manage = permit(PERMISSIONS.FEATURE_FLAGS_MANAGE);

router.use(authenticate);
router.use(permit(PERMISSIONS.FEATURE_FLAGS_VIEW));

// Static routes before /:key to avoid param conflicts
router.patch('/testers/:userId', manage, featureFlagController.setTesterFlags);
router.get('/users/:userId', featureFlagController.getFeaturesForUser);

router.get('/', featureFlagController.list);
router.post('/', manage, featureFlagController.create);
router.get('/:key', featureFlagController.getByKey);
router.patch('/:key', manage, featureFlagController.update);
router.delete('/:key', manage, featureFlagController.remove);

router.post('/:key/rollback', manage, featureFlagController.rollback);
router.get('/:key/assignments', featureFlagController.listAssignments);
router.post('/:key/assignments', manage, featureFlagController.createAssignment);
router.delete('/:key/assignments/:assignmentId', manage, featureFlagController.deleteAssignment);

export default router;
