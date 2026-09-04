import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { inventoryController } from './inventory.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'operations_manager'));

// ── Static routes first (must precede /:id) ───────────────────────────────────
router.get('/low-stock-count', inventoryController.lowStockCount);

// ── Generic resource routes ───────────────────────────────────────────────────
router.post('/',      inventoryController.create);
router.get('/',        inventoryController.list);
router.get('/:id',     inventoryController.getById);
router.patch('/:id',   inventoryController.update);
router.delete('/:id',  inventoryController.deleteItem);

// ── Stock movements (nested under an item) ────────────────────────────────────
router.get('/:id/movements',  inventoryController.listMovements);
router.post('/:id/movements', inventoryController.createMovement);

export default router;
