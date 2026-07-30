import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { aiImageUploadMiddleware, documentUploadMiddleware } from '../../lib/image-upload';
import { plannerController } from './planner.controller';

const router = Router();

router.use(authenticate);

router.post('/extract/image', aiImageUploadMiddleware, plannerController.extractFromImage);
router.post('/extract/pdf', documentUploadMiddleware, plannerController.extractFromPdf);
router.get('/extract/jobs/:id', plannerController.getExtractionJob);
router.post('/confirm', plannerController.confirmPlanner);

router.get('/mine', plannerController.getMine);

router.patch('/:id/tasks/:taskId', plannerController.toggleTask);
router.get('/:id/progress', plannerController.getProgress);
router.get('/:id/pace', plannerController.getPace);

export default router;
