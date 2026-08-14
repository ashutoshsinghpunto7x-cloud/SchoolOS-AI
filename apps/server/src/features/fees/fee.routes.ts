import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { feeController } from './fee.controller';

const router = Router();

router.use(authenticate);

// Fee-collecting/managing roles — reception takes front-desk payments, accountant
// and admin manage records; other authenticated roles (teacher etc.) get read-only
// access via the GET routes below.
const canWriteFees = authorize('admin', 'accountant', 'reception');

// ── Static routes first (must precede /:id) ───────────────────────────────────
router.post('/payment',            canWriteFees,     feeController.recordPayment);
router.post('/payment/bulk',       canWriteFees,     feeController.recordBulkPayment);
router.get('/payments/receipt/:receiptNumber',       feeController.getPaymentByReceipt);
router.get('/payments/:id/whatsapp-receipt',         feeController.getWhatsappReceiptStatus);
router.post('/payments/:id/whatsapp-receipt/retry', canWriteFees, feeController.retryWhatsappReceipt);
router.get('/payments/:id/receipt.pdf',              feeController.downloadReceiptPdf);
router.get('/outstanding',                           feeController.getOutstanding);
router.get('/summary',                               feeController.getSummary);
router.get('/student/:studentId',                    feeController.getStudentFees);

// ── Generic resource routes ───────────────────────────────────────────────────
router.post('/',                   canWriteFees,     feeController.create);
router.get('/',                                      feeController.list);
router.get('/:id',                                   feeController.getById);
router.patch('/:id',               canWriteFees,     feeController.update);
router.delete('/:id', authorize('admin'),            feeController.deleteFeeRecord);

export default router;
