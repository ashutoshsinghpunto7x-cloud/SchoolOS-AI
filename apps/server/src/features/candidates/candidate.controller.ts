import { Request, Response, NextFunction } from 'express';
import { candidateService } from './candidate.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { ValidationError } from '../../middlewares/errorHandler';

export const candidateController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('No resume uploaded. Send it in a "file" form field.');
      const ctx = buildAuthContext(req.user!);
      const candidate = await candidateService.createCandidate(req.body, ctx, req.file);
      sendCreated(res, candidate, 'Candidate logged');
    } catch (err) { next(err); }
  },

  async checkDuplicate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const duplicates = await candidateService.checkDuplicate(req.query, ctx);
      sendSuccess(res, duplicates);
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await candidateService.listCandidates(req.query, ctx);
      sendPaginated(res, result.candidates, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const candidate = await candidateService.getCandidate(req.params.id, ctx);
      sendSuccess(res, candidate);
    } catch (err) { next(err); }
  },

  async forward(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const candidate = await candidateService.forwardCandidate(req.params.id, req.body, ctx);
      sendSuccess(res, candidate, 'Candidate forwarded');
    } catch (err) { next(err); }
  },

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const candidate = await candidateService.rejectCandidate(req.params.id, req.body, ctx);
      sendSuccess(res, candidate, 'Candidate rejected');
    } catch (err) { next(err); }
  },

  async markUnderReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const candidate = await candidateService.markUnderReview(req.params.id, ctx);
      sendSuccess(res, candidate, 'Marked under review');
    } catch (err) { next(err); }
  },

  async setFinalDecision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const candidate = await candidateService.setFinalDecision(req.params.id, req.body, ctx);
      sendSuccess(res, candidate, 'Decision recorded');
    } catch (err) { next(err); }
  },

  async deleteCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await candidateService.deleteCandidate(req.params.id, ctx);
      sendSuccess(res, null, 'Candidate deleted');
    } catch (err) { next(err); }
  },
};
