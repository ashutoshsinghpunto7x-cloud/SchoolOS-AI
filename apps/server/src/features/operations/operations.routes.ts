import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { operationsService } from './operations.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'operations_manager'));

router.get('/summary', async (req, res, next) => {
  try {
    const ctx = buildAuthContext(req.user!);
    const summary = await operationsService.getSummary(ctx);
    sendSuccess(res, summary);
  } catch (err) { next(err); }
});

export default router;
