import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { academicYearController } from './academic-year.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'principal', 'teacher', 'accountant', 'academic_coordinator'));

router.get('/current', academicYearController.getCurrent);
router.put('/current', authorize('admin', 'principal', 'academic_coordinator'), academicYearController.upsert);
router.post('/current/special-days', authorize('admin', 'principal', 'academic_coordinator'), academicYearController.addSpecialDay);

export default router;
