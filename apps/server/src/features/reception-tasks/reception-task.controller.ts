import { Request, Response, NextFunction } from 'express';
import { receptionTaskService } from './reception-task.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { ValidationError } from '../../middlewares/errorHandler';
import type { ReceptionTaskStatus } from './reception-task.model';

const ASSIGNABLE_STATUSES: ReceptionTaskStatus[] = ['open', 'in_progress', 'completed', 'snoozed', 'cancelled'];

export const receptionTaskController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const task = await receptionTaskService.createTask(req.body, ctx);
      sendCreated(res, task, 'Task created');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await receptionTaskService.listTasks(req.query, ctx);
      sendPaginated(res, result.tasks, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const task = await receptionTaskService.getTask(req.params.id, ctx);
      sendSuccess(res, task);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const task = await receptionTaskService.updateTask(req.params.id, req.body, ctx);
      sendSuccess(res, task, 'Task updated');
    } catch (err) { next(err); }
  },

  async setStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const status = req.body?.status;
      if (!ASSIGNABLE_STATUSES.includes(status)) throw new ValidationError('Invalid status.');
      const task = await receptionTaskService.setStatus(req.params.id, status, ctx);
      sendSuccess(res, task, `Task marked as ${task.status}`);
    } catch (err) { next(err); }
  },

  async complete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const task = await receptionTaskService.completeTask(req.params.id, req.body, ctx);
      sendSuccess(res, task, 'Task completed');
    } catch (err) { next(err); }
  },

  async snooze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!);
      const task = await receptionTaskService.snoozeTask(req.params.id, req.body, ctx);
      sendSuccess(res, task, 'Task snoozed');
    } catch (err) { next(err); }
  },

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await receptionTaskService.deleteTask(req.params.id, ctx);
      sendSuccess(res, null, 'Task deleted');
    } catch (err) { next(err); }
  },
};
