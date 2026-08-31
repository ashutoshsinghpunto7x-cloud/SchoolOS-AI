import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { aiImageUploadMiddleware, chapterImagesUploadMiddleware, documentUploadMiddleware } from '../../lib/image-upload';
import { questionBankController } from './question-bank.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'principal', 'teacher'));

// Extraction — static routes before /:id-style routes
router.post('/extract/image', aiImageUploadMiddleware, questionBankController.extractFromImage);
router.post('/extract/pdf', documentUploadMiddleware, questionBankController.extractFromPdf);
router.post('/extract/chapter', chapterImagesUploadMiddleware, questionBankController.extractChapter);
router.get('/extract/jobs/:id', questionBankController.getExtractionJob);
router.post('/extract/jobs/:id/pages/:pageNumber/retry', aiImageUploadMiddleware, questionBankController.retryChapterPage);
router.post('/extract/confirm', questionBankController.confirmExtracted);

router.get('/sources', questionBankController.listSources);
router.get('/sources/:id', questionBankController.getSource);
router.post('/sources', questionBankController.saveChapterSource);
router.patch('/sources/:id', questionBankController.updateSource);
router.delete('/sources/:id', questionBankController.deleteSource);
router.post('/sources/:id/re-extract', questionBankController.reExtractSource);

router.get('/chapters', questionBankController.listChapters);

router.post('/papers/generate', questionBankController.generatePaper);
router.get('/papers/:id', questionBankController.getPaper);

router.get('/questions', questionBankController.listQuestions);
router.post('/questions', questionBankController.createQuestion);
router.get('/questions/groups', questionBankController.listQuestionGroups);
router.delete('/questions/groups', questionBankController.deleteQuestionGroups);
router.get('/questions/:id', questionBankController.getQuestion);
router.patch('/questions/:id', questionBankController.updateQuestion);
router.delete('/questions/:id', questionBankController.deleteQuestion);

export default router;
