import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { workflowController } from './workflow.controller';

const router = Router();

router.use(authenticate);

// Dashboard metrics — admin only
router.get('/dashboard', authorize('admin'), workflowController.getDashboardMetrics);

// List all 8 workflows (with per-school config merged)
router.get('/', authorize('admin'), workflowController.list);

// Single workflow
router.get('/:workflowId', authorize('admin'), workflowController.getOne);

// Update per-school config (enable/disable, delay, channels, etc.)
router.patch('/:workflowId/config', authorize('admin'), workflowController.updateConfig);

// Trigger a workflow manually
router.post('/trigger', authorize('admin'), workflowController.trigger);

// Execution stats for a specific workflow
router.get('/:workflowId/stats', authorize('admin'), workflowController.getStats);

export default router;
