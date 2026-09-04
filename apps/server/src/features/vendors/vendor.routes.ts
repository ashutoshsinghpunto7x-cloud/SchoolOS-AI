import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { vendorController } from './vendor.controller';

const router = Router();

router.use(authenticate);
// 'operations_manager' can read (Operations picks a vendor for a Purchase
// Order and links out to this workspace) but not write — vendor records,
// bills and payments stay owned by admin/accountant.
router.use(authorize('admin', 'accountant', 'operations_manager'));

// ── Static routes first (must precede /:id) ───────────────────────────────────
router.get('/bills/summary', authorize('admin', 'accountant'), vendorController.getBillsSummary);
router.get('/bills/overdue', authorize('admin', 'accountant'), vendorController.getOverdueBills);

// ── Generic resource routes ───────────────────────────────────────────────────
router.post('/',      authorize('admin', 'accountant'), vendorController.create);
router.get('/',       vendorController.list);
router.get('/:id',    vendorController.getById);
router.patch('/:id',  authorize('admin', 'accountant'), vendorController.update);
router.delete('/:id', authorize('admin'), vendorController.deleteVendor);

// ── Bills & payments (nested under a vendor) ──────────────────────────────────
router.get('/:id/ledger',    authorize('admin', 'accountant'), vendorController.getLedger);
router.get('/:id/bills',     authorize('admin', 'accountant'), vendorController.listBills);
router.post('/:id/bills',    authorize('admin', 'accountant'), vendorController.createBill);
router.post('/:id/payments', authorize('admin', 'accountant'), vendorController.recordPayment);

export default router;
