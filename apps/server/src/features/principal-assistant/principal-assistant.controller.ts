import { Request, Response, NextFunction } from 'express';
import { principalAssistantService } from './principal-assistant.service';
import { principalAssistantActionService } from './principal-assistant.action.service';
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
