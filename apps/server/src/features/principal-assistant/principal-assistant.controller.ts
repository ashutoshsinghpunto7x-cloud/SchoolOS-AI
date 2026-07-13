import { Request, Response, NextFunction } from 'express';
import { principalAssistantService } from './principal-assistant.service';
import { sendSuccess } from '../../lib/response';
import { buildAuthContext } from '../../lib/auth-context';

export const principalAssistantController = {
  /** POST /principal-assistant/chat */
  async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ctx    = buildAuthContext(req.user!, req.ip);
      const result = await principalAssistantService.chat(req.body, ctx);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
};
