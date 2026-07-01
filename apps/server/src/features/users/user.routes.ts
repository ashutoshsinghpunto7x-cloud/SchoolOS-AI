import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);

// Available to all authenticated users
router.get('/roles', userController.getRoles);
router.get('/permissions', userController.getPermissions);

// Admin-only user management
router.use(authorize('admin'));

router.get('/', userController.list);
router.post('/', userController.create);
router.get('/:id', userController.getById);
router.patch('/:id/status', userController.changeStatus);
router.patch('/:id', userController.update);
router.delete('/:id', userController.remove);

export default router;
