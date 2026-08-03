import { Router } from 'express';
import { maintenanceController } from './maintenance.controller';
import { authenticate } from '../../middlewares/authenticate';
import { permit } from '../../middlewares/permit';
import { PERMISSIONS } from '../../lib/permissions';

// Ops Center management surface. Viewing the current state requires
// MAINTENANCE_VIEW (all Ops roles); scheduling/toggling requires
// MAINTENANCE_MANAGE (owner/super_admin only) — same split as feature-flags.
const router = Router();
const manage = permit(PERMISSIONS.MAINTENANCE_MANAGE);

router.use(authenticate);
router.use(permit(PERMISSIONS.MAINTENANCE_VIEW));

router.get('/', maintenanceController.getState);
router.post('/schedule', manage, maintenanceController.schedule);
router.delete('/schedule', manage, maintenanceController.cancelSchedule);
router.post('/toggle', manage, maintenanceController.toggle);

export default router;
