import { Request, Response, NextFunction } from 'express';
import { reportCardService } from './report-card.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const reportCardController = {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const card = await reportCardService.generate(req.body, ctx);
      sendSuccess(res, card, 'Report card generated');
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const card = await reportCardService.getById(req.params.id, ctx);
      sendSuccess(res, card);
    } catch (err) { next(err); }
  },

  async getQrImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await reportCardService.getQrImage(req.params.id, ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async getByExamStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const card = await reportCardService.getByExamStudent(req.params.examId, req.params.studentId, ctx);
      sendSuccess(res, card);
    } catch (err) { next(err); }
  },

  async getRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const roster = await reportCardService.getRoster(req.query, ctx);
      sendSuccess(res, roster);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const card = await reportCardService.update(req.params.id, req.body, ctx);
      sendSuccess(res, card, 'Report card updated');
    } catch (err) { next(err); }
  },

  async regenerateRemark(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const card = await reportCardService.regenerateRemark(req.params.id, ctx);
      sendSuccess(res, card, 'Remark regenerated');
    } catch (err) { next(err); }
  },

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const card = await reportCardService.publish(req.params.id, ctx);
      sendSuccess(res, card, 'Report card published');
    } catch (err) { next(err); }
  },

  // ── Public (no auth) ────────────────────────────────────────────────────────
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reportCardService.verifyByToken(req.params.token);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
};
