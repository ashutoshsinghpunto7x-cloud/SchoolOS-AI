import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { payrollController } from './payroll.controller';

const router = Router();

router.use(authenticate);

router.post('/generate',     authorize('admin'), payrollController.generate);
router.post('/generate-all', authorize('admin'), payrollController.generateAll);

// ── Static routes first (must precede /:id) ───────────────────────────────────
router.get('/summary', authorize('admin', 'accountant'), payrollController.getSummary);
router.get('/me',      payrollController.listMine);

router.get('/',                authorize('admin', 'accountant'), payrollController.list);
router.get('/:id',             authorize('admin', 'accountant'), payrollController.getById);
router.patch('/:id/mark-paid', authorize('admin', 'accountant'), payrollController.markPaid);

export default router;
