import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { feeStructureController } from './fee-structure.controller';

const router = Router();

router.use(authenticate);

// ── Class Fee Structure ──────────────────────────────────────────────────────
router.get('/', feeStructureController.list);
router.post('/', authorize('admin', 'principal', 'accountant'), feeStructureController.upsert);
router.get('/template', feeStructureController.getTemplate);
router.post('/apply-all', authorize('admin', 'principal', 'accountant'), feeStructureController.applyToAllClasses);
router.delete('/:id', authorize('admin', 'principal', 'accountant'), feeStructureController.remove);

// ── Discount Approval ────────────────────────────────────────────────────────
router.get('/discounts/pending', authorize('admin', 'principal'), feeStructureController.listPendingDiscounts);
router.get('/discounts/student/:studentId', feeStructureController.listStudentDiscounts);
router.post('/discounts', authorize('admin', 'accountant'), feeStructureController.createDiscountRequest);
router.patch('/discounts/:id/approve', authorize('admin', 'principal'), feeStructureController.approveDiscountRequest);
router.patch('/discounts/:id/reject', authorize('admin', 'principal'), feeStructureController.rejectDiscountRequest);

export default router;
