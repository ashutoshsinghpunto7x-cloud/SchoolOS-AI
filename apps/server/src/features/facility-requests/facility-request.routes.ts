import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { facilityRequestController } from './facility-request.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'operations_manager', 'accountant'));

// ── Static routes first (must precede /:id) ───────────────────────────────────
router.get('/open-count', authorize('admin', 'operations_manager'), facilityRequestController.openCount);
router.get('/sla-report', authorize('admin', 'operations_manager'), facilityRequestController.slaReport);

// ── Generic resource routes ───────────────────────────────────────────────────
router.post('/',   facilityRequestController.create);
router.get('/',    facilityRequestController.list);
router.get('/:id', facilityRequestController.getById);

// ── Triage — Operations Manager (and admin) only ──────────────────────────────
router.put('/:id/assign', authorize('admin', 'operations_manager'), facilityRequestController.assign);
router.put('/:id/status', authorize('admin', 'operations_manager'), facilityRequestController.updateStatus);

export default router;
