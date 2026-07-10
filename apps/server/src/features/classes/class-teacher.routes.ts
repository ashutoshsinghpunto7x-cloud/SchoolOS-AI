import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { classTeacherController } from './class-teacher.controller';

const router = Router();

router.use(authenticate);

// Admin and principal manage assignments; accountants only need to read them (to prefill defaulter notifications).
router.get('/', authorize('admin', 'principal', 'accountant'), classTeacherController.list);
router.put('/teacher', authorize('admin', 'principal'), classTeacherController.upsert);

export default router;
