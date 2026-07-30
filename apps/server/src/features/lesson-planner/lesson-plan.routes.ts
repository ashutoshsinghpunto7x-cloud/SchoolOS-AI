import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { lessonPlanController } from './lesson-plan.controller';

const router = Router();

router.use(authenticate);

router.post('/generate', lessonPlanController.generate);
router.post('/', lessonPlanController.save);
router.get('/', lessonPlanController.list);
router.get('/:id', lessonPlanController.getById);
router.patch('/:id', lessonPlanController.update);
router.delete('/:id', lessonPlanController.delete);

export default router;
