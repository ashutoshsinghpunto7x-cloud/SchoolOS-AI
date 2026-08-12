import { Router } from 'express';
import { moduleAccessController } from './module-restriction.controller';
import { authenticate } from '../../middlewares/authenticate';

// Every authenticated app user (any role) hits this to know which modules
// are currently restricted for them — mirrors feature-flag.public.routes.ts.
// Not permission-gated beyond being logged in.
const router = Router();

router.use(authenticate);
router.get('/status', moduleAccessController.status);

export default router;
