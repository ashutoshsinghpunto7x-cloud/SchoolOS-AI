import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { syllabusTrackerController } from './syllabus-tracker.controller';

const router = Router();

router.use(authenticate);

router.get('/overview', syllabusTrackerController.getOverview);
router.get('/activity', syllabusTrackerController.getActivity);

export default router;
