import { Request, Response, NextFunction } from 'express';
import { enquiryService } from './enquiry.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const enquiryController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const enquiry = await enquiryService.createEnquiry(req.body, ctx);
      sendCreated(res, enquiry, 'Enquiry created');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await enquiryService.listEnquiries(req.query, ctx);
      sendPaginated(res, result.enquiries, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getStageCounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const counts = await enquiryService.getStageCounts(ctx);
      sendSuccess(res, counts);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const enquiry = await enquiryService.getEnquiry(req.params.id, ctx);
      sendSuccess(res, enquiry);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const enquiry = await enquiryService.updateEnquiry(req.params.id, req.body, ctx);
      sendSuccess(res, enquiry, 'Enquiry updated');
    } catch (err) { next(err); }
  },

  async updateStage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const enquiry = await enquiryService.updateStage(req.params.id, req.body, ctx);
      sendSuccess(res, enquiry, 'Stage updated');
    } catch (err) { next(err); }
  },

  async convert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await enquiryService.convertToStudent(req.params.id, req.body, ctx);
      sendCreated(res, result, 'Enquiry converted to student');
    } catch (err) { next(err); }
  },

  async deleteEnquiry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await enquiryService.deleteEnquiry(req.params.id, ctx);
      sendSuccess(res, null, 'Enquiry deleted');
    } catch (err) { next(err); }
  },

  // ── Notes ───────────────────────────────────────────────────────────────────

  async listNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx   = buildAuthContext(req.user!);
      const notes = await enquiryService.listNotes(req.params.id, ctx);
      sendSuccess(res, notes);
    } catch (err) { next(err); }
  },

  async createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const note = await enquiryService.createNote(req.params.id, req.body, ctx);
      sendCreated(res, note, 'Note added');
    } catch (err) { next(err); }
  },

  async updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const note = await enquiryService.updateNote(req.params.id, req.params.noteId, req.body, ctx);
      sendSuccess(res, note, 'Note updated');
    } catch (err) { next(err); }
  },

  async deleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await enquiryService.deleteNote(req.params.id, req.params.noteId, ctx);
      sendSuccess(res, null, 'Note deleted');
    } catch (err) { next(err); }
  },
};
