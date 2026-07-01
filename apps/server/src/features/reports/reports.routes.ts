import { Router } from 'express';
import { reportsController } from './reports.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'accountant'));

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics/:category', reportsController.getAnalytics);

// ── Saved reports ─────────────────────────────────────────────────────────────
router.get('/saved',         reportsController.listSavedReports);
router.post('/saved',        reportsController.saveReport);
router.get('/saved/:id',     reportsController.getSavedReport);
router.delete('/saved/:id',  reportsController.deleteSavedReport);

export default router;
