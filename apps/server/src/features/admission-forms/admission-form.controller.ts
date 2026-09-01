import { Request, Response, NextFunction } from 'express';
import { admissionFormService } from './admission-form.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { ValidationError } from '../../middlewares/errorHandler';

export const admissionFormController = {
  async issue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.issueForm(req.body, ctx);
      sendCreated(res, form, 'Admission form issued');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await admissionFormService.listForms(req.query, ctx);
      sendPaginated(res, result.forms, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.getForm(req.params.id, ctx);
      sendSuccess(res, form);
    } catch (err) { next(err); }
  },

  async getByEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.getFormByEnquiry(req.params.enquiryId, ctx);
      sendSuccess(res, form);
    } catch (err) { next(err); }
  },

  async updatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.updatePayment(req.params.id, req.body, ctx);
      sendSuccess(res, form, 'Payment status updated');
    } catch (err) { next(err); }
  },

  async recordSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.recordSubmission(req.params.id, ctx);
      sendSuccess(res, form, 'Submission recorded');
    } catch (err) { next(err); }
  },

  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.verifyForm(req.params.id, req.body, ctx);
      sendSuccess(res, form, form.verificationStatus === 'verified' ? 'Form verified' : 'Form rejected');
    } catch (err) { next(err); }
  },

  async resubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.resubmit(req.params.id, ctx);
      sendSuccess(res, form, 'Resubmission recorded');
    } catch (err) { next(err); }
  },

  async addChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.addChecklistItem(req.params.id, req.body, ctx);
      sendSuccess(res, form, 'Document added to checklist');
    } catch (err) { next(err); }
  },

  async removeChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.removeChecklistItem(req.params.id, req.params.itemId, ctx);
      sendSuccess(res, form, 'Document removed from checklist');
    } catch (err) { next(err); }
  },

  async updateChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.updateChecklistItem(req.params.id, req.params.itemId, req.body, ctx);
      sendSuccess(res, form, 'Document updated');
    } catch (err) { next(err); }
  },

  async uploadChecklistItemFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new ValidationError('No file uploaded. Send the scan in a "file" form field.');
      const ctx = buildAuthContext(req.user!);
      const form = await admissionFormService.uploadChecklistItemFile(req.params.id, req.params.itemId, req.file, ctx);
      sendSuccess(res, form, 'Document scan saved');
    } catch (err) { next(err); }
  },

  async deleteForm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await admissionFormService.deleteForm(req.params.id, ctx);
      sendSuccess(res, null, 'Admission form deleted');
    } catch (err) { next(err); }
  },
};
