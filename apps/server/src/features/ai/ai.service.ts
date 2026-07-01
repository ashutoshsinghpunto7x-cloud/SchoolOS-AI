import { aiConversationRepository, aiUsageRepository } from './ai.repository';
import { IAiConversation } from './ai.model';
import { openaiProvider, estimateCost } from './providers/llm/openai.provider';
import { vapiProvider } from './providers/voice/vapi.provider';
import { promptLibrary } from './prompts/prompt.library';
import { vapiWebhookSchema } from './ai.validation';
import { Communication } from '../communications/communication.model';
import { auditService } from '../audit/audit.service';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { NotFoundError } from '../../middlewares/errorHandler';

// ── Input types ───────────────────────────────────────────────────────────────

export interface VoiceCallInput {
  commId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  className: string;
  staffName: string;
  triggeredBy: string;
  schoolId: string;
  promptId?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const aiService = {
  /**
   * Initiates a Vapi outbound call.
   * Caller must fire-and-forget (.catch(err => logger.error(...))).
   */
  async initiateVoiceCall(input: VoiceCallInput): Promise<void> {
    const promptId = input.promptId ?? 'general-parent-call';
    const template = promptLibrary.get(promptId);

    const ctx = {
      studentName: input.studentName,
      parentName: input.parentName,
      parentPhone: input.parentPhone,
      className: input.className,
      staffName: input.staffName,
      schoolName: env.SCHOOL_NAME,
    };

    const systemPrompt = template.buildSystemPrompt(ctx);
    const firstMessage = template.buildFirstMessage(ctx);

    // Create AiConversation record before calling Vapi
    const conversation = await aiConversationRepository.create({
      provider: 'vapi',
      promptId,
      promptVersion: template.version,
      communicationId: input.commId,
      studentId: input.studentId,
      createdBy: input.staffName,
      schoolId: input.schoolId,
    });

    const convId = conversation._id.toString();

    try {
      const callResult = await vapiProvider.createCall({
        toNumber: input.parentPhone,
        assistant: {
          firstMessage,
          model: {
            provider: 'openai',
            model: env.OPENAI_MODEL,
            systemPrompt,
            temperature: 0.5,
            maxTokens: 350,
          },
          voice: {
            provider: 'vapi',
            voiceId: env.ELEVENLABS_VOICE_ID,
          },
          maxDurationSeconds: 300,
          endCallMessage: 'Thank you for your time. Have a great day!',
          backgroundSound: 'office',
          recordingEnabled: false,
        },
        metadata: {
          communicationId: input.commId,
          conversationId: convId,
          schoolId: input.schoolId,
        },
      });

      // Store Vapi call ID for webhook correlation
      await aiConversationRepository.updateById(convId, {
        conversationId: callResult.callId,
        status: 'pending',
      });

      auditService.log({
        userId: input.triggeredBy,
        userDisplayName: input.staffName,
        action: 'ai.call_initiated',
        resource: 'ai_conversations',
        resourceId: convId,
        details: {
          vapiCallId: callResult.callId,
          communicationId: input.commId,
          promptId,
        },
        schoolId: input.schoolId,
      });

      logger.info('[AiService] Voice call initiated via Vapi', {
        vapiCallId: callResult.callId,
        commId: input.commId,
        convId,
      });
    } catch (err) {
      await aiConversationRepository.updateById(convId, { status: 'failed' });
      await Communication.findByIdAndUpdate(input.commId, {
        $set: { status: 'FAILED', summary: 'Call initiation failed.' },
      });

      auditService.log({
        userId: input.triggeredBy,
        userDisplayName: input.staffName,
        action: 'ai.call_failed',
        resource: 'ai_conversations',
        resourceId: convId,
        details: { error: err instanceof Error ? err.message : 'Unknown error', communicationId: input.commId },
        schoolId: input.schoolId,
      });

      logger.error('[AiService] Voice call initiation failed', { commId: input.commId, convId, err });
    }
  },

  /**
   * Handles all Vapi webhook events.
   * Validates the optional secret, then routes by event type.
   */
  async handleVapiWebhook(body: unknown, secret?: string): Promise<void> {
    if (env.VAPI_WEBHOOK_SECRET && secret !== env.VAPI_WEBHOOK_SECRET) {
      throw new Error('Invalid Vapi webhook secret');
    }

    const parsed = vapiWebhookSchema.safeParse(body);
    if (!parsed.success) {
      logger.warn('[AiService] Invalid Vapi webhook payload', { error: parsed.error.flatten() });
      return;
    }

    const { message } = parsed.data;
    const callId = message.call?.id;

    auditService.log({
      userId: 'system',
      userDisplayName: 'Vapi Webhook',
      action: 'ai.webhook_received',
      resource: 'ai_conversations',
      resourceId: callId ?? 'unknown',
      details: { type: message.type },
      schoolId: 'system',
    });

    logger.info('[AiService] Vapi webhook received', { type: message.type, callId });

    switch (message.type) {
      case 'status-update':
        await aiService._handleStatusUpdate(callId, message.status);
        break;
      case 'end-of-call-report':
        await aiService._handleEndOfCallReport(callId, message);
        break;
      default:
        logger.debug('[AiService] Vapi event ignored', { type: message.type });
    }
  },

  /** Processes status-update events. */
  async _handleStatusUpdate(
    callId: string | undefined,
    status: string | undefined
  ): Promise<void> {
    if (!callId || !status) return;

    const conv = await aiConversationRepository.findByConversationId(callId);
    if (!conv) {
      logger.warn('[AiService] No conversation found for Vapi callId', { callId });
      return;
    }

    const commStatus = status === 'in-progress' ? 'RUNNING' : undefined;
    const convStatus = status === 'in-progress' ? 'active' : undefined;

    if (commStatus) {
      await Communication.findByIdAndUpdate(conv.communicationId, {
        $set: { status: commStatus },
      });
    }
    if (convStatus) {
      await aiConversationRepository.updateByConversationId(callId, { status: convStatus });
    }
  },

  /** Processes end-of-call-report events — the primary result handler. */
  async _handleEndOfCallReport(
    callId: string | undefined,
    message: ReturnType<typeof vapiWebhookSchema.parse>['message']
  ): Promise<void> {
    if (!callId) return;

    const conv = await aiConversationRepository.findByConversationId(callId);
    if (!conv) {
      logger.warn('[AiService] No conversation found for end-of-call', { callId });
      return;
    }

    const rawTranscript = message.artifact?.transcript ?? message.transcript ?? '';
    const vapiSummary = message.analysis?.summary ?? message.summary ?? '';
    const durationSeconds = message.durationSeconds;
    const endedReason = message.endedReason ?? '';

    // Determine final status
    const failed = endedReason.includes('error') || endedReason.includes('failed');
    const commStatus = failed ? 'FAILED' : 'COMPLETED';
    const convStatus = failed ? 'failed' : 'completed';

    // Update AiConversation with transcript
    await aiConversationRepository.updateByConversationId(callId, {
      status: convStatus,
      transcript: rawTranscript,
      summary: vapiSummary,
      durationSeconds,
      metadata: { endedReason, successEvaluation: message.analysis?.successEvaluation },
    });

    // Analyze transcript with OpenAI to extract structured summary + recommendation
    let summary = vapiSummary;
    let recommendation = '';
    let nextFollowUp = '';

    if (rawTranscript && openaiProvider.isAvailable()) {
      try {
        const analysis = await aiService._analyzeTranscript(
          rawTranscript,
          conv,
          conv.schoolId
        );
        summary = analysis.summary || summary;
        recommendation = analysis.recommendation ?? '';
        nextFollowUp = analysis.nextFollowUp ?? '';
      } catch (err) {
        logger.error('[AiService] Transcript analysis failed — using Vapi summary', { callId, err });
      }
    }

    // Update Communication with final result
    await Communication.findByIdAndUpdate(conv.communicationId, {
      $set: {
        status: commStatus,
        summary: summary || (failed ? 'Call ended unexpectedly.' : 'Call completed.'),
        ...(recommendation && { recommendation }),
        ...(nextFollowUp && { nextFollowUp }),
      },
    });

    auditService.log({
      userId: 'system',
      userDisplayName: 'Vapi AI',
      action: failed ? 'ai.call_failed' : 'ai.call_completed',
      resource: 'ai_conversations',
      resourceId: conv._id.toString(),
      details: { callId, commId: conv.communicationId, durationSeconds, endedReason },
      schoolId: conv.schoolId,
    });

    logger.info('[AiService] End-of-call processed', {
      callId,
      commId: conv.communicationId,
      commStatus,
      hasSummary: Boolean(summary),
    });
  },

  /** Calls OpenAI to produce a structured summary from the raw transcript. */
  async _analyzeTranscript(
    transcript: string,
    conv: IAiConversation,
    schoolId: string
  ): Promise<{ summary: string; recommendation?: string; nextFollowUp?: string }> {
    const template = promptLibrary.get(conv.promptId);
    const start = Date.now();

    const result = await openaiProvider.complete({
      systemPrompt: `You are an AI analyst for ${env.SCHOOL_NAME}.
Analyze this phone call transcript and return a JSON object with:
- "summary": 1-2 sentence plain-English summary of the call outcome
- "recommendation": (optional) one actionable next step for the school staff
- "nextFollowUp": (optional) a suggested follow-up date or timeframe if the parent requested one

Focus on: ${template.extractionHint}
Return ONLY valid JSON. No markdown.`,
      userPrompt: `Transcript:\n${transcript.slice(0, 4000)}`,
      temperature: 0.2,
      maxTokens: 300,
      jsonResponse: true,
    });

    const durationMs = Date.now() - start;

    // Fire-and-forget usage record
    aiUsageRepository.record({
      provider: 'openai',
      aiModel: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      estimatedCostUsd: estimateCost(result.model, result.promptTokens, result.completionTokens),
      durationMs,
      communicationId: conv.communicationId,
      conversationId: conv._id.toString(),
      schoolId,
    });

    auditService.log({
      userId: 'system',
      userDisplayName: 'OpenAI',
      action: 'ai.transcript_processed',
      resource: 'ai_conversations',
      resourceId: conv._id.toString(),
      details: { model: result.model, totalTokens: result.totalTokens },
      schoolId,
    });

    try {
      return JSON.parse(result.content) as {
        summary: string;
        recommendation?: string;
        nextFollowUp?: string;
      };
    } catch {
      return { summary: result.content };
    }
  },

  /** Returns the AI conversation linked to a given communication. */
  async getConversationByCommunication(
    communicationId: string,
    schoolId: string
  ): Promise<IAiConversation | null> {
    const conv = await aiConversationRepository.findByCommunicationId(communicationId);
    if (!conv) return null;
    if (conv.schoolId !== schoolId) throw new NotFoundError('AI conversation');
    return conv;
  },

  /** Returns whether direct Vapi integration is active. */
  isVapiActive(): boolean {
    return vapiProvider.isAvailable();
  },

  /** Returns whether OpenAI integration is active. */
  isOpenAiActive(): boolean {
    return openaiProvider.isAvailable();
  },
};
