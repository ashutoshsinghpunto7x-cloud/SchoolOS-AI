import { Request, Response, NextFunction } from 'express';
import { eventService } from './event.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const eventController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx   = buildAuthContext(req.user!);
      const event = await eventService.createEvent(req.body, ctx);
      sendCreated(res, event, 'Event created');
    } catch (err) { next(err); }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const result = await eventService.listEvents(req.query, ctx);
      sendPaginated(res, result.events, { page: result.page, limit: result.limit, total: result.total });
    } catch (err) { next(err); }
  },

  async getUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!);
      const events = await eventService.getUpcoming(req.query, ctx);
      sendSuccess(res, events);
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx   = buildAuthContext(req.user!);
      const event = await eventService.getEvent(req.params.id, ctx);
      sendSuccess(res, event);
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx   = buildAuthContext(req.user!);
      const event = await eventService.updateEvent(req.params.id, req.body, ctx);
      sendSuccess(res, event, 'Event updated');
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx   = buildAuthContext(req.user!);
      const event = await eventService.updateStatus(req.params.id, req.body, ctx);
      sendSuccess(res, event, 'Event status updated');
    } catch (err) { next(err); }
  },

  async deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await eventService.deleteEvent(req.params.id, ctx);
      sendSuccess(res, null, 'Event deleted');
    } catch (err) { next(err); }
  },

  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      await eventService.markRead(req.params.id, ctx);
      res.status(204).end();
    } catch (err) { next(err); }
  },

  async getReadReceipts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx     = buildAuthContext(req.user!);
      const receipts = await eventService.getReadReceipts(req.params.id, ctx);
      sendSuccess(res, receipts);
    } catch (err) { next(err); }
  },
};
