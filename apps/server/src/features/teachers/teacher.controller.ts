import { Request, Response, NextFunction } from 'express';
import { teacherService } from './teacher.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const teacherController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const teacher = await teacherService.createTeacher(req.body, ctx);
      sendCreated(res, teacher, 'Teacher record created successfully');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await teacherService.listTeachers(req.query, ctx);
      sendPaginated(res, result.teachers, {
        page:  result.page,
        limit: result.limit,
        total: result.total,
      });
    } catch (err) { next(err); }
  },

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx      = buildAuthContext(req.user!);
      const q        = typeof req.query.q === 'string' ? req.query.q : undefined;
      const teachers = await teacherService.searchTeachers(ctx, q);
      sendSuccess(res, teachers);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const teacher = await teacherService.getTeacher(req.params.id, ctx);
      sendSuccess(res, teacher);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const teacher = await teacherService.updateTeacher(req.params.id, req.body, ctx);
      sendSuccess(res, teacher, 'Teacher updated successfully');
    } catch (err) { next(err); }
  },

  async changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const teacher = await teacherService.changeStatus(req.params.id, req.body, ctx);
      sendSuccess(res, teacher, 'Teacher status updated');
    } catch (err) { next(err); }
  },

  async deleteTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await teacherService.deleteTeacher(req.params.id, ctx);
      sendSuccess(res, null, 'Teacher record deleted');
    } catch (err) { next(err); }
  },

  // ── Link User Account ─────────────────────────────────────────────────────

  async linkUserAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const teacher = await teacherService.linkUserAccount(req.params.id, req.body, ctx);
      sendSuccess(res, teacher, 'User account linked successfully');
    } catch (err) { next(err); }
  },

  // ── Notes ──────────────────────────────────────────────────────────────────

  async createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const note = await teacherService.createNote(req.params.id, req.body, ctx);
      sendCreated(res, note, 'Note added');
    } catch (err) { next(err); }
  },

  async listNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx   = buildAuthContext(req.user!);
      const notes = await teacherService.listNotes(req.params.id, ctx);
      sendSuccess(res, notes);
    } catch (err) { next(err); }
  },

  async updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const note = await teacherService.updateNote(req.params.id, req.params.noteId, req.body, ctx);
      sendSuccess(res, note, 'Note updated');
    } catch (err) { next(err); }
  },

  async deleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await teacherService.deleteNote(req.params.id, req.params.noteId, ctx);
      sendSuccess(res, null, 'Note deleted');
    } catch (err) { next(err); }
  },
};
