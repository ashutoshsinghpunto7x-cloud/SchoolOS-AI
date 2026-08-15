import { Router } from 'express';
import { parentWorkspaceController } from './parent-workspace.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('parent'));

router.get('/', parentWorkspaceController.getWorkspace);
router.get('/academics', parentWorkspaceController.getAcademics);
router.get('/attendance', parentWorkspaceController.getAttendance);
router.get('/fees', parentWorkspaceController.getFees);
router.get('/report-card', parentWorkspaceController.getReportCard);
router.post('/ai/ask', parentWorkspaceController.askAI);

export default router;
