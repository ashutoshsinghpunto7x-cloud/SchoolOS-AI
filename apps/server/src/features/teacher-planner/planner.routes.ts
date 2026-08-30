import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { plannerController } from './planner.controller';

const router = Router();

router.use(authenticate);

// Principal/admin read-only views — static routes before /:id to avoid param conflicts.
const canViewPrincipalPlanner = authorize('admin', 'principal');
router.get('/principal/overview',            canViewPrincipalPlanner, plannerController.getPrincipalOverview);
router.post('/principal/:id/tasks',          canViewPrincipalPlanner, plannerController.addTaskForTeacher);
router.get('/principal/:teacherId',          canViewPrincipalPlanner, plannerController.getForTeacher);

router.get('/chapters',                      plannerController.listChapters);
router.get('/teaching-weeks',                plannerController.getTeachingWeeks);
router.post('/generate',                     plannerController.generate);
router.post('/confirm',                      plannerController.confirmPlanner);

router.get('/mine',                          plannerController.getMine);

router.patch('/:id/tasks/:taskId',           plannerController.toggleTask);
router.get('/:id/progress',                  plannerController.getProgress);
router.get('/:id/pace',                      plannerController.getPace);

export default router;
