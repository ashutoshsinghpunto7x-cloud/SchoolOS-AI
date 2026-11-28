import { Request, Response, NextFunction } from 'express';
import { principalAssistantService } from './principal-assistant.service';
import { principalAssistantActionService } from './principal-assistant.action.service';
import { exportAnswer } from './principal-assistant.export';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const principalAssistantController = {
  /** POST /principal-assistant/chat — polymorphic: {type:'text',reply} or {type:'action_preview',...}. Never mutates. */
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!, req.ip);
      const result = await principalAssistantService.chat(req.body, ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  /** POST /principal-assistant/reset — forgets the remembered student/class/period ("new chat"). */
  async reset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx = buildAuthContext(req.user!, req.ip);
      await principalAssistantService.resetConversation(ctx);
      sendSuccess(res, { reset: true });
    } catch (err) { next(err); }
  },

  /** POST /principal-assistant/export — returns the answer text the Principal is viewing as a PDF or Excel file. */
  async exportAnswer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = await exportAnswer(req.body);
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      res.send(file.buffer);
    } catch (err) { next(err); }
  },

  /** POST /principal-assistant/action/preview — re-preview after an edited field. Never mutates. */
  async previewAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!, req.ip);
      const result = await principalAssistantActionService.preview(req.body, ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  /** POST /principal-assistant/action/execute — the only mutating endpoint in this feature. */
  async executeAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!, req.ip);
      const result = await principalAssistantActionService.execute(req.body, ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
};
