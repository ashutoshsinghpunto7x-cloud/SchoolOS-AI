import { Router } from 'express';
import { featureFlagController } from './feature-flag.controller';
import { authenticate } from '../../middlewares/authenticate';

// Every authenticated app user (teachers, principals, etc. — not just Ops
// staff) hits this to know which flags are on for them. Deliberately not
// permission-gated beyond being logged in.
const router = Router();

router.use(authenticate);
router.get('/evaluate', featureFlagController.evaluate);

export default router;
