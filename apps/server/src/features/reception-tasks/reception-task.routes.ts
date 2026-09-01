import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { receptionTaskController } from './reception-task.controller';

const router = Router();
router.use(authenticate);

// Reception/counselors manage their own tasks; principal/admin can create,
// assign, and view across everyone (enforced in the service layer, not just
// here — see reception-task.service.ts OVERSIGHT_ROLES).
const canAccessTasks = authorize('admin', 'principal', 'incharge', 'reception');

router.post('/',                canAccessTasks, receptionTaskController.create);
router.get('/',                 canAccessTasks, receptionTaskController.list);
router.get('/:id',              canAccessTasks, receptionTaskController.getById);
router.patch('/:id',            canAccessTasks, receptionTaskController.update);
router.patch('/:id/status',     canAccessTasks, receptionTaskController.setStatus);
router.patch('/:id/complete',   canAccessTasks, receptionTaskController.complete);
router.patch('/:id/snooze',     canAccessTasks, receptionTaskController.snooze);
router.delete('/:id',           canAccessTasks, receptionTaskController.deleteTask);

export default router;
