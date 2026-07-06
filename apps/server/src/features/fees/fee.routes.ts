import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { feeController } from './fee.controller';

const router = Router();

router.use(authenticate);

// ── Static routes first (must precede /:id) ───────────────────────────────────
router.post('/payment',                              feeController.recordPayment);
router.post('/payment/bulk',                         feeController.recordBulkPayment);
router.get('/payments/receipt/:receiptNumber',       feeController.getPaymentByReceipt);
router.get('/outstanding',                           feeController.getOutstanding);
router.get('/summary',                               feeController.getSummary);
router.get('/student/:studentId',                    feeController.getStudentFees);

// ── Generic resource routes ───────────────────────────────────────────────────
router.post('/',                                     feeController.create);
router.get('/',                                      feeController.list);
router.get('/:id',                                   feeController.getById);
router.patch('/:id',                                 feeController.update);
router.delete('/:id', authorize('admin'),            feeController.deleteFeeRecord);

export default router;
