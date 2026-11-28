import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { adminOverviewService } from './admin-overview.service';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
    sendSuccess(res, await adminOverviewService.getOverview(ctx.schoolId), 'Overview loaded');
  } catch (err) {
    next(err);
  }
});

export default router;
