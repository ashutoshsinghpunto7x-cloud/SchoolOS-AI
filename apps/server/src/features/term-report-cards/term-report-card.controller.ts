import { Request, Response, NextFunction } from 'express';
import { termReportCardService } from './term-report-card.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const termReportCardController = {
  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const card = await termReportCardService.generate(req.body, ctx);
      sendSuccess(res, card, 'Term report card generated');
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const card = await termReportCardService.getById(req.params.id, ctx);
      sendSuccess(res, card);
    } catch (err) { next(err); }
  },

  async getQrImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await termReportCardService.getQrImage(req.params.id, ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async getByStudentYear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const card = await termReportCardService.getByStudentYear(req.params.studentId, req.params.academicYear, ctx);
      sendSuccess(res, card);
    } catch (err) { next(err); }
  },

  async getRoster(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const roster = await termReportCardService.getRoster(req.query, ctx);
      sendSuccess(res, roster);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const card = await termReportCardService.update(req.params.id, req.body, ctx);
      sendSuccess(res, card, 'Term report card updated');
    } catch (err) { next(err); }
  },

  async updateSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const card = await termReportCardService.updateSkills(req.params.id, req.body, ctx);
      sendSuccess(res, card, 'Skill grades updated');
    } catch (err) { next(err); }
  },

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const card = await termReportCardService.publish(req.params.id, ctx);
      sendSuccess(res, card, 'Term report card published');
    } catch (err) { next(err); }
  },

  // ── Public (no auth) ────────────────────────────────────────────────────────
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await termReportCardService.verifyByToken(req.params.token);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
};
