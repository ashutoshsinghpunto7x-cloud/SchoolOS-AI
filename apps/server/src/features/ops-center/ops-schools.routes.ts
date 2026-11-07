import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { permit } from '../../middlewares/permit';
import { PERMISSIONS } from '../../lib/permissions';
import { opsSchoolsController } from './ops-schools.controller';

const router = Router();

router.use(authenticate);
// Creating a tenant is a write: restricted to owner/super_admin (the only roles holding
// module-access.manage), not every Ops viewer (devops/developer/support).
router.use(permit(PERMISSIONS.MODULE_ACCESS_MANAGE));

router.post('/schools', opsSchoolsController.create);

export default router;
