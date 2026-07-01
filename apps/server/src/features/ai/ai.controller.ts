import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';
import { sendSuccess } from '../../lib/response';
import { logger } from '../../lib/logger';
import { env } from '../../config/env';

export const aiController = {
  /** POST /ai/webhook/vapi — receives all Vapi call events (public, no auth). */
  async vapiWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const secret = (req.headers['x-vapi-secret'] as string) ?? undefined;
      // Acknowledge immediately — Vapi expects a fast 200
      res.status(200).json({ received: true });
      // Process async — errors are absorbed here to not crash the process
      aiService.handleVapiWebhook(req.body, secret).catch((err: Error) => {
        logger.error('[AiController] Vapi webhook processing error', { err: err.message });
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /ai/conversations/:communicationId
   * Returns the AI conversation for a given communication (requires auth).
   */
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { communicationId } = req.params;
      const { schoolId } = req.user!;
      const conv = await aiService.getConversationByCommunication(communicationId, schoolId);
      sendSuccess(res, conv, conv ? 'AI conversation found' : 'No AI conversation for this communication');
    } catch (err) {
      next(err);
    }
  },

  /** GET /ai/status — provider health check (admin only). */
  async status(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, {
        providers: {
          vapi: {
            active: aiService.isVapiActive(),
            configured: Boolean(env.VAPI_API_KEY),
          },
          openai: {
            active: aiService.isOpenAiActive(),
            configured: Boolean(env.OPENAI_API_KEY),
            model: env.OPENAI_MODEL,
          },
          elevenlabs: {
            configured: Boolean(env.ELEVENLABS_API_KEY),
            voiceId: env.ELEVENLABS_VOICE_ID,
          },
        },
        mode: aiService.isVapiActive() ? 'direct-vapi' : env.N8N_WEBHOOK_URL ? 'n8n' : 'mock',
      });
    } catch (err) {
      next(err);
    }
  },
};
