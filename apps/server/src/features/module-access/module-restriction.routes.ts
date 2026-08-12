import { Router } from 'express';
import { moduleAccessController } from './module-restriction.controller';
import { authenticate } from '../../middlewares/authenticate';
import { permit } from '../../middlewares/permit';
import { PERMISSIONS } from '../../lib/permissions';

// Ops Center management surface. Viewing requires MODULE_ACCESS_VIEW (all Ops
// roles); restricting/restoring requires MODULE_ACCESS_MANAGE (owner/super_admin
// only) — same split as feature-flags and maintenance.
const router = Router();
const manage = permit(PERMISSIONS.MODULE_ACCESS_MANAGE);

router.use(authenticate);
router.use(permit(PERMISSIONS.MODULE_ACCESS_VIEW));

router.get('/', moduleAccessController.list);
router.post('/bulk', manage, moduleAccessController.bulkSet);

export default router;
