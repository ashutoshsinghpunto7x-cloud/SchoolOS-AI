import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { expenseController } from './expense.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'accountant'));

// ── Static routes first (must precede /:id) ───────────────────────────────────
router.get('/summary', expenseController.getSummary);

// ── Generic resource routes ───────────────────────────────────────────────────
router.post('/',      expenseController.create);
router.get('/',       expenseController.list);
router.get('/:id',    expenseController.getById);
router.patch('/:id',  expenseController.update);
router.delete('/:id', authorize('admin'), expenseController.deleteExpenseRecord);

export default router;
