import { Request, Response, NextFunction } from 'express';
import { studentService } from './student.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const studentController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const student = await studentService.createStudent(req.body, ctx);
      sendCreated(res, student, 'Student admission created successfully');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const result = await studentService.listStudents(req.query, ctx);
      sendPaginated(res, result.students, {
        page: result.page,
        limit: result.limit,
        total: result.total,
      });
    } catch (err) { next(err); }
  },

  /** Lightweight search for autocomplete (CommunicationWorkspace StudentSearch). */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const students = await studentService.searchStudents(ctx, q);
      sendSuccess(res, students);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const student = await studentService.getStudent(req.params.id, ctx);
      sendSuccess(res, student, 'Student fetched successfully');
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const student = await studentService.updateStudent(req.params.id, req.body, ctx);
      sendSuccess(res, student, 'Student updated successfully');
    } catch (err) { next(err); }
  },

  async updateRollNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const student = await studentService.updateRollNumber(req.params.id, req.body, ctx);
      sendSuccess(res, student, 'Roll number updated');
    } catch (err) { next(err); }
  },

  async updateFeeProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const student = await studentService.updateFeeProfile(req.params.id, req.body, ctx);
      sendSuccess(res, student, 'Student details updated');
    } catch (err) { next(err); }
  },

  async changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const student = await studentService.changeStatus(req.params.id, req.body, ctx);
      sendSuccess(res, student, 'Student status updated');
    } catch (err) { next(err); }
  },

  async deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await studentService.deleteStudent(req.params.id, ctx);
      sendSuccess(res, null, 'Student record deleted');
    } catch (err) { next(err); }
  },

  // ── Notes ──────────────────────────────────────────────────────────────────

  async createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const note = await studentService.createNote(req.params.id, req.body, ctx);
      sendCreated(res, note, 'Note added');
    } catch (err) { next(err); }
  },

  async listNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const notes = await studentService.listNotes(req.params.id, ctx);
      sendSuccess(res, notes);
    } catch (err) { next(err); }
  },

  async updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const note = await studentService.updateNote(req.params.id, req.params.noteId, req.body, ctx);
      sendSuccess(res, note, 'Note updated');
    } catch (err) { next(err); }
  },

  async deleteNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await studentService.deleteNote(req.params.id, req.params.noteId, ctx);
      sendSuccess(res, null, 'Note deleted');
    } catch (err) { next(err); }
  },
};
