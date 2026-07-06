import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { salaryController } from './salary.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'accountant'));

// ── Static routes first (must precede /:id) ───────────────────────────────────
router.get('/summary', salaryController.getSummary);

// ── Generic resource routes ───────────────────────────────────────────────────
router.post('/',                salaryController.create);
router.get('/',                 salaryController.list);
router.get('/:id',              salaryController.getById);
router.patch('/:id',            salaryController.update);
router.patch('/:id/mark-paid',  salaryController.markPaid);
router.patch('/:id/force-pending', salaryController.forcePending);
router.delete('/:id', authorize('admin'), salaryController.deleteSalaryRecord);

export default router;
