import { Request, Response, NextFunction } from 'express';
import { communicationService } from './communication.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';
import { assertWhatsAppSendAllowed } from '../../lib/whatsapp-test-gate';

export const communicationController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const result = await communicationService.list(req.query, ctx);
      sendPaginated(res, result.data, result.meta);
    } catch (err) {
      next(err);
    }
  },

  async listByStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const data = await communicationService.listByStudent(req.params.studentId, ctx);
      sendSuccess(res, data, 'Communications fetched');
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const data = await communicationService.getById(req.params.id, ctx);
      sendSuccess(res, data, 'Communication fetched');
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await communicationService.update(req.params.id, req.body, ctx);
      sendSuccess(res, data, 'Communication updated');
    } catch (err) {
      next(err);
    }
  },

  async initiateCall(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const communication = await communicationService.initiateCall(req.body, ctx);
      sendCreated(res, communication, 'Call initiated');
    } catch (err) {
      next(err);
    }
  },

  async webhookCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const secret = req.headers['x-automation-secret'] as string | undefined;
      const updated = await communicationService.handleWebhookCallback(req.body, secret);
      sendSuccess(res, updated, 'Communication updated via webhook');
    } catch (err) {
      next(err);
    }
  },

  async createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const communication = await communicationService.createNote(req.body, ctx);
      sendCreated(res, communication, 'Note saved');
    } catch (err) {
      next(err);
    }
  },

  async sendWhatsApp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      assertWhatsAppSendAllowed(ctx.schoolId);
      const communication = await communicationService.sendWhatsApp(req.body, ctx);
      sendCreated(res, communication, 'WhatsApp recorded');
    } catch (err) {
      next(err);
    }
  },
};
