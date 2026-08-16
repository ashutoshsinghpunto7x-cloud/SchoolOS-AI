import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { vendorController } from './vendor.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'accountant'));

// ── Static routes first (must precede /:id) ───────────────────────────────────
router.get('/bills/summary', vendorController.getBillsSummary);
router.get('/bills/overdue', vendorController.getOverdueBills);

// ── Generic resource routes ───────────────────────────────────────────────────
router.post('/',      vendorController.create);
router.get('/',       vendorController.list);
router.get('/:id',    vendorController.getById);
router.patch('/:id',  vendorController.update);
router.delete('/:id', authorize('admin'), vendorController.deleteVendor);

// ── Bills & payments (nested under a vendor) ──────────────────────────────────
router.get('/:id/ledger',    vendorController.getLedger);
router.get('/:id/bills',     vendorController.listBills);
router.post('/:id/bills',    vendorController.createBill);
router.post('/:id/payments', vendorController.recordPayment);

export default router;
