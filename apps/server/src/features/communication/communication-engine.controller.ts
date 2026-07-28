import { Request, Response, NextFunction } from 'express';
import { buildAuthContext } from '../../lib/auth-context';
import { sendSuccess } from '../../lib/response';
import { NotFoundError } from '../../middlewares/errorHandler';
import { attendanceNotificationService } from './attendance-notification.service';
import { feeNotificationService } from './fee-notification.service';
import { broadcastService } from './broadcast.service';
import { communicationEngineService } from './communication-engine.service';
import { dashboardService } from './dashboard.service';
import { messageTemplateService } from './message-template.service';
import { webhookService } from './webhook.service';
import { notificationLogRepository } from './notification-log.repository';
import { bulkSendJobRepository } from './bulk-send-job.repository';
import { listLogsQuerySchema } from './communication-engine.validation';

export const communicationEngineController = {
  // ── Attendance / Fees / Broadcast ────────────────────────────────────────
  async sendAttendanceNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const result = await attendanceNotificationService.sendAbsentNotifications(req.body, ctx);
      sendSuccess(res, result, 'Absent notifications dispatched');
    } catch (err) { next(err); }
  },

  async sendFeeReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const result = await feeNotificationService.sendFeeReminders(req.body, ctx);
      sendSuccess(res, result, 'Fee reminders dispatched');
    } catch (err) { next(err); }
  },

  async broadcastSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await broadcastService.toSchool(req.body, ctx), 'Broadcast dispatched to entire school');
    } catch (err) { next(err); }
  },

  async broadcastClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await broadcastService.toClass(req.body, ctx), 'Broadcast dispatched to class');
    } catch (err) { next(err); }
  },

  async broadcastSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await broadcastService.toSection(req.body, ctx), 'Broadcast dispatched to section');
    } catch (err) { next(err); }
  },

  async broadcastStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await broadcastService.toStudents(req.body, ctx), 'Broadcast dispatched to selected students');
    } catch (err) { next(err); }
  },

  async broadcastParents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await broadcastService.toParents(req.body, ctx), 'Broadcast dispatched to selected parents');
    } catch (err) { next(err); }
  },

  async broadcastTeachers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await broadcastService.toTeachers(req.body, ctx), 'Broadcast dispatched to selected teachers');
    } catch (err) { next(err); }
  },

  // ── Logs / Jobs ───────────────────────────────────────────────────────────
  async listLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const opts = listLogsQuerySchema.parse(req.query);
      const result = await notificationLogRepository.findAll(ctx.schoolId, opts);
      sendSuccess(res, { logs: result.logs, total: result.total, page: result.page, limit: result.limit });
    } catch (err) { next(err); }
  },

  async getLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const log = await notificationLogRepository.findById(req.params.id, ctx.schoolId);
      if (!log) throw new NotFoundError('Notification log');
      sendSuccess(res, log);
    } catch (err) { next(err); }
  },

  async retryLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      const log = await communicationEngineService.retry(req.params.id, ctx);
      sendSuccess(res, log, 'Notification retried');
    } catch (err) { next(err); }
  },

  async listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      sendSuccess(res, await bulkSendJobRepository.list(ctx.schoolId));
    } catch (err) { next(err); }
  },

  async getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      const job = await bulkSendJobRepository.findById(req.params.id, ctx.schoolId);
      if (!job) throw new NotFoundError('Bulk send job');
      sendSuccess(res, job);
    } catch (err) { next(err); }
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  async getDashboardSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      sendSuccess(res, await dashboardService.getSummary(ctx));
    } catch (err) { next(err); }
  },

  async getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      sendSuccess(res, await dashboardService.getRecentActivity(ctx));
    } catch (err) { next(err); }
  },

  async getFailedNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      sendSuccess(res, await dashboardService.getFailed(ctx));
    } catch (err) { next(err); }
  },

  async retryAllFailed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await dashboardService.retryAllFailed(ctx), 'Retry sweep completed');
    } catch (err) { next(err); }
  },

  // ── Templates ─────────────────────────────────────────────────────────────
  async listTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!);
      sendSuccess(res, await messageTemplateService.list(ctx));
    } catch (err) { next(err); }
  },

  async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await messageTemplateService.create(req.body, ctx), 'Template created', 201);
    } catch (err) { next(err); }
  },

  async updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await messageTemplateService.update(req.params.id, req.body, ctx), 'Template updated');
    } catch (err) { next(err); }
  },

  async activateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      sendSuccess(res, await messageTemplateService.activate(req.params.id, ctx), 'Template activated');
    } catch (err) { next(err); }
  },

  async deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip ?? undefined);
      await messageTemplateService.remove(req.params.id, ctx);
      sendSuccess(res, null, 'Template deleted');
    } catch (err) { next(err); }
  },

  // ── Meta WhatsApp Cloud API webhook (public, no JWT) ─────────────────────
  async verifyWebhook(req: Request, res: Response): Promise<void> {
    const mode = String(req.query['hub.mode'] ?? '');
    const token = String(req.query['hub.verify_token'] ?? '');
    const challenge = String(req.query['hub.challenge'] ?? '');

    const result = webhookService.verify(mode, token, challenge);
    if (result === null) {
      res.status(403).send('Verification failed');
      return;
    }
    res.status(200).send(result);
  },

  async receiveWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await webhookService.handleIncoming(req.body);
      res.status(200).json({ received: true });
    } catch (err) { next(err); }
  },
};
