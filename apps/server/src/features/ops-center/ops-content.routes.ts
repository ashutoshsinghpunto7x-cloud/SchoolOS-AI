import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { permit } from '../../middlewares/permit';
import { PERMISSIONS } from '../../lib/permissions';
import { aiImageUploadMiddleware, chapterImagesUploadMiddleware } from '../../lib/image-upload';
import { opsContentController } from './ops-content.controller';

const router = Router();

router.use(authenticate);
router.use(permit(PERMISSIONS.OPS_VIEW));

// Lets Ops Centre staff run the teacher "Chapter Capture" upload flow on behalf of any school —
// same underlying question-bank service functions, scoped by the :schoolId route param instead of
// the caller's own (non-tenant) account. See ops-content.controller.ts.
router.get('/schools/:schoolId/classes', opsContentController.listClasses);
router.get('/schools/:schoolId/question-bank/overview', opsContentController.getOverview);
router.post('/schools/:schoolId/question-bank/extract/chapter', chapterImagesUploadMiddleware, opsContentController.extractChapter);
router.get('/schools/:schoolId/question-bank/extract/jobs/:id', opsContentController.getExtractionJob);
router.post('/schools/:schoolId/question-bank/extract/jobs/:id/pages/:pageNumber/retry', aiImageUploadMiddleware, opsContentController.retryChapterPage);
router.post('/schools/:schoolId/question-bank/extract/confirm', opsContentController.confirmExtracted);

export default router;
