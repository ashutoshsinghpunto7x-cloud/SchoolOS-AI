import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { fileToDataUri } from '../../lib/image-upload';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { ValidationError } from '../../middlewares/errorHandler';
import { questionExtractionService } from './question-extraction.service';
import { questionBankService } from './question-bank.service';
import { paperGeneratorService } from './paper-generator.service';
import {
  extractionTargetSchema,
  confirmExtractedQuestionsSchema,
  createQuestionSchema,
  updateQuestionSchema,
  listQuestionsSchema,
  listChaptersSchema,
  paperGenerationConfigSchema,
} from './question-bank.validation';

export const questionBankController = {
  /** POST /question-bank/extract/image?class=8&subject=Science */
  async extractFromImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('An image file is required');
      const target = extractionTargetSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const job = await questionExtractionService.enqueueExtractFromImage(
        target.class, target.subject, fileToDataUri(req.file), ctx, req.file.originalname,
      );
      sendCreated(res, job, 'Reading the page…');
    } catch (err) { next(err); }
  },

  /** POST /question-bank/extract/pdf?class=8&subject=Science */
  async extractFromPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('A PDF file is required');
      const target = extractionTargetSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const job = await questionExtractionService.enqueueExtractFromPdf(
        target.class, target.subject, req.file.buffer, ctx, req.file.originalname,
      );
      sendCreated(res, job, 'Reading the document…');
    } catch (err) { next(err); }
  },

  /** GET /question-bank/extract/jobs/:id */
  async getExtractionJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const job = await questionExtractionService.getExtractionJob(req.params.id, ctx);
      sendSuccess(res, job);
    } catch (err) { next(err); }
  },

  /** POST /question-bank/extract/confirm — save reviewed draft questions to the bank */
  async confirmExtracted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = confirmExtractedQuestionsSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const questions = await questionBankService.confirmExtractedQuestions(data, ctx);
      sendCreated(res, questions, `${questions.length} question(s) saved to the bank`);
    } catch (err) { next(err); }
  },

  /** GET /question-bank/sources?class=8&subject=Science — past uploads whose converted text was saved for reuse */
  async listSources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listChaptersSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const sources = await questionBankService.listSources(query, ctx);
      sendSuccess(res, sources);
    } catch (err) { next(err); }
  },

  /** GET /question-bank/sources/:id */
  async getSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const source = await questionBankService.getSource(req.params.id, ctx);
      sendSuccess(res, source);
    } catch (err) { next(err); }
  },

  /** POST /question-bank/sources/:id/re-extract — regenerate draft questions from a saved upload's converted text */
  async reExtractSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const job = await questionBankService.reExtractSource(req.params.id, ctx);
      sendCreated(res, job, 'Re-reading the saved text…');
    } catch (err) { next(err); }
  },

  /** GET /question-bank/chapters?class=8&subject=Science */
  async listChapters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listChaptersSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const chapters = await questionBankService.listChapters(query, ctx);
      sendSuccess(res, chapters);
    } catch (err) { next(err); }
  },

  /** GET /question-bank/questions */
  async listQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listQuestionsSchema.parse(req.query);
      const ctx = buildAuthContext(req.user!);
      const result = await questionBankService.listQuestions(query, ctx);
      sendPaginated(res, result.questions, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  /** GET /question-bank/questions/:id */
  async getQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const question = await questionBankService.getQuestion(req.params.id, ctx);
      sendSuccess(res, question);
    } catch (err) { next(err); }
  },

  /** POST /question-bank/questions — manual add without AI */
  async createQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createQuestionSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const question = await questionBankService.createQuestion(data, ctx);
      sendCreated(res, question, 'Question added');
    } catch (err) { next(err); }
  },

  /** PATCH /question-bank/questions/:id */
  async updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateQuestionSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const question = await questionBankService.updateQuestion(req.params.id, data, ctx);
      sendSuccess(res, question, 'Question updated');
    } catch (err) { next(err); }
  },

  /** DELETE /question-bank/questions/:id */
  async deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await questionBankService.deleteQuestion(req.params.id, ctx);
      sendSuccess(res, null, 'Question deleted');
    } catch (err) { next(err); }
  },

  /** POST /question-bank/papers/generate */
  async generatePaper(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = paperGenerationConfigSchema.parse(req.body);
      const ctx = buildAuthContext(req.user!);
      const paper = await paperGeneratorService.generate(config, ctx);
      sendCreated(res, paper, 'Paper generated');
    } catch (err) { next(err); }
  },

  /** GET /question-bank/papers/:id */
  async getPaper(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const paper = await paperGeneratorService.getById(req.params.id, ctx);
      sendSuccess(res, paper);
    } catch (err) { next(err); }
  },
};
