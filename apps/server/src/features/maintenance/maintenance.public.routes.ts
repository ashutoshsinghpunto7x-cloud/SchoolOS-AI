import { Router } from 'express';
import { maintenanceController } from './maintenance.controller';

// Deliberately not behind `authenticate` — the login page needs to know
// maintenance is active before a session exists, and a user who's blocked
// mid-session on the Under Maintenance screen has no guarantee their token
// is still being sent/valid either.
const router = Router();

router.get('/status', maintenanceController.status);

export default router;
