import { Request, Response, NextFunction } from 'express';
import { AuthContext } from '../../lib/auth-context';
import { fileToDataUri } from '../../lib/image-upload';
import { sendSuccess, sendCreated } from '../../lib/response';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { opsRepository } from './ops.repository';
import { schoolClassService } from '../school-classes/school-class.service';
import { questionBankService } from '../question-bank/question-bank.service';
import { questionExtractionService } from '../question-bank/question-extraction.service';
import {
  extractChapterTargetSchema,
  confirmExtractedQuestionsSchema,
  retryPageParamsSchema,
} from '../question-bank/question-bank.validation';

/**
 * Lets Ops Centre staff run the same "photograph a chapter → AI drafts questions → review → save"
 * flow teachers use, on behalf of ANY school. Ops accounts aren't tenant-scoped (unlike
 * req.user.schoolId for a teacher), so every function here builds its own AuthContext from the
 * :schoolId route param instead of the caller's own token — school-classes/question-bank services
 * take a plain AuthContext and don't care who built it.
 */
async function buildOpsContext(req: Request): Promise<AuthContext> {
  const { schoolId } = req.params;
  const school = await opsRepository.getSchoolDetail(schoolId);
  if (!school) throw new NotFoundError('School');
  return {
    userId: req.user!.userId,
    schoolId,
    displayName: `${req.user!.firstName} ${req.user!.lastName} (Ops)`,
    role: req.user!.role,
  };
}

export const opsContentController = {
  /** GET /ops/schools/:schoolId/classes */
  async listClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const school = await opsRepository.getSchoolDetail(req.params.schoolId);
      if (!school) throw new NotFoundError('School');
      const classes = await schoolClassService.list(req.params.schoolId);
      sendSuccess(res, classes);
    } catch (err) { next(err); }
  },

  /** GET /ops/schools/:schoolId/question-bank/overview */
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = await buildOpsContext(req);
      const overview = await questionBankService.getPrincipalOverview(ctx);
      sendSuccess(res, overview);
    } catch (err) { next(err); }
  },

  /** POST /ops/schools/:schoolId/question-bank/extract/chapter */
  async extractChapter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (files.length === 0) throw new ValidationError('At least one page image is required');
      const target = extractChapterTargetSchema.parse(req.body ?? {});
      const images = files.map((f) => ({ dataUri: fileToDataUri(f), fileName: f.originalname }));
      const ctx = await buildOpsContext(req);
      const job = await questionBankService.enqueueChapterCapture(target.class, target.subject, target.chapterName, images, ctx, target.detectImages);
      sendCreated(res, job, `Reading ${files.length} page(s)…`);
    } catch (err) { next(err); }
  },

  /** GET /ops/schools/:schoolId/question-bank/extract/jobs/:id */
  async getExtractionJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = await buildOpsContext(req);
      const job = await questionExtractionService.getExtractionJob(req.params.id, ctx);
      sendSuccess(res, job);
    } catch (err) { next(err); }
  },

  /** POST /ops/schools/:schoolId/question-bank/extract/jobs/:id/pages/:pageNumber/retry */
  async retryChapterPage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('An image file is required');
      const params = retryPageParamsSchema.parse({ id: req.params.id, pageNumber: req.params.pageNumber });
      const ctx = await buildOpsContext(req);
      const result = await questionBankService.retryChapterPage(params.id, params.pageNumber, fileToDataUri(req.file), ctx);
      sendSuccess(res, result, 'Page reprocessed');
    } catch (err) { next(err); }
  },

  /** POST /ops/schools/:schoolId/question-bank/extract/confirm */
  async confirmExtracted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = confirmExtractedQuestionsSchema.parse(req.body);
      const ctx = await buildOpsContext(req);
      const questions = await questionBankService.confirmExtractedQuestions(data, ctx);
      sendCreated(res, questions, `${questions.length} question(s) saved to the bank`);
    } catch (err) { next(err); }
  },
};
