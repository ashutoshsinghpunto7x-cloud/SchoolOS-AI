import { Request, Response, NextFunction } from 'express';
import { reportCardTemplateService } from './report-card-template.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const reportCardTemplateController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const template = await reportCardTemplateService.create(req.body, ctx);
      sendCreated(res, template, 'Report card template created');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const templates = await reportCardTemplateService.listAll(req.query, ctx);
      sendSuccess(res, templates);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const template = await reportCardTemplateService.getById(req.params.id, ctx);
      sendSuccess(res, template);
    } catch (err) { next(err); }
  },

  async getByClassYear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const template = await reportCardTemplateService.getByClassYear(req.params.class, req.params.academicYear, ctx);
      sendSuccess(res, template);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const template = await reportCardTemplateService.update(req.params.id, req.body, ctx);
      sendSuccess(res, template, 'Report card template updated');
    } catch (err) { next(err); }
  },

  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const template = await reportCardTemplateService.publish(req.params.id, ctx);
      sendSuccess(res, template, 'Report card template published');
    } catch (err) { next(err); }
  },

  async unpublish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const template = await reportCardTemplateService.unpublish(req.params.id, ctx);
      sendSuccess(res, template, 'Report card template moved back to draft');
    } catch (err) { next(err); }
  },

  async deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await reportCardTemplateService.deleteTemplate(req.params.id, ctx);
      sendSuccess(res, null, 'Report card template deleted');
    } catch (err) { next(err); }
  },

  async clone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const template = await reportCardTemplateService.cloneFromPreviousYear(req.body, ctx);
      sendCreated(res, template, 'Report card template cloned');
    } catch (err) { next(err); }
  },
};
