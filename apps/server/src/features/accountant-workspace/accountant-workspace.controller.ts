import { Request, Response, NextFunction } from 'express';
import { accountantWorkspaceService } from './accountant-workspace.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const accountantWorkspaceController = {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await accountantWorkspaceService.getDashboard(ctx);
      sendSuccess(res, data, 'Dashboard loaded');
    } catch (err) {
      next(err);
    }
  },

  async getGroupedDefaulters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await accountantWorkspaceService.getGroupedDefaulters(ctx);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async sendDefaultersToTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await accountantWorkspaceService.sendDefaultersToTeacher(req.body, ctx);
      sendSuccess(res, null, 'Defaulters list emailed to teacher');
    } catch (err) {
      next(err);
    }
  },

  async sendReceiptEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await accountantWorkspaceService.sendReceiptEmail(req.body, ctx);
      sendSuccess(res, null, 'Receipt emailed');
    } catch (err) {
      next(err);
    }
  },

  async getStudentLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await accountantWorkspaceService.getStudentLedger(req.params, ctx);
      sendSuccess(res, data, 'Student ledger loaded');
    } catch (err) {
      next(err);
    }
  },

  async getClassFeeSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx  = buildAuthContext(req.user!, req.ip ?? undefined);
      const data = await accountantWorkspaceService.getClassFeeSummary(req.query, ctx);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async sendLedgerWhatsAppReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await accountantWorkspaceService.sendLedgerWhatsAppReminder(req.params, ctx);
      sendSuccess(res, null, 'WhatsApp reminder sent');
    } catch (err) {
      next(err);
    }
  },

  async sendLedgerStatementEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await accountantWorkspaceService.sendLedgerStatementEmail(req.params, ctx);
      sendSuccess(res, null, 'Statement emailed');
    } catch (err) {
      next(err);
    }
  },
};
