import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { schoolClassController } from './school-class.controller';

const router = Router();

router.use(authenticate);

router.get('/', schoolClassController.list);
router.get('/fee-overview', schoolClassController.getFeeOverview);
router.post('/', authorize('admin', 'principal', 'accountant'), schoolClassController.create);
router.patch('/:id', authorize('admin', 'principal', 'accountant'), schoolClassController.rename);
router.post('/:id/sections', authorize('admin', 'principal', 'accountant'), schoolClassController.addSection);
router.delete('/:id/sections', authorize('admin', 'principal', 'accountant'), schoolClassController.removeSection);
router.delete('/:id', authorize('admin', 'principal', 'accountant'), schoolClassController.remove);

export default router;
