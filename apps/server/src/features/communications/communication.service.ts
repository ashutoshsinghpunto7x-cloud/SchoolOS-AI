import { communicationRepository, PaginatedCommunications, FindAllOptions } from './communication.repository';
import {
  initiateCallSchema,
  createNoteSchema,
  sendWhatsAppSchema,
  webhookCallbackSchema,
  updateCommunicationSchema,
  listQuerySchema,
} from './communication.validation';
import { Student, IStudent } from '../students/student.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { ICommunication } from './communication.model';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { automationService } from '../automation/automation.service';
import { aiService } from '../ai/ai.service';
import { twilioWhatsAppProvider, isTwilioConfigured } from './providers/twilio-whatsapp.provider';

// ── Service ───────────────────────────────────────────────────────────────────

export const communicationService = {
  async list(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedCommunications> {
    const opts = listQuerySchema.parse(rawQuery);
    const options: FindAllOptions = {
      page: opts.page,
      limit: opts.limit,
      search: opts.search,
      type: opts.type,
      status: opts.status,
      sortOrder: opts.sortOrder,
    };
    return communicationRepository.findAll(ctx.schoolId, options);
  },

  async listByStudent(studentId: string, ctx: AuthContext): Promise<ICommunication[]> {
    return communicationRepository.findByStudent(studentId, ctx.schoolId);
  },

  async getById(id: string, ctx: AuthContext): Promise<ICommunication> {
    const comm = await communicationRepository.findById(id, ctx.schoolId);
    if (!comm) throw new NotFoundError('Communication');
    return comm;
  },

  async update(id: string, rawInput: unknown, ctx: AuthContext): Promise<ICommunication> {
    const data = updateCommunicationSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const updated = await communicationRepository.updateById(id, data, ctx.schoolId);
    if (!updated) throw new NotFoundError('Communication');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'comm.updated',
      resource: 'communications',
      resourceId: id,
      details: { fields: Object.keys(data) },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return updated;
  },

  async initiateCall(rawInput: unknown, ctx: AuthContext): Promise<ICommunication> {
    const { studentId } = initiateCallSchema.parse(rawInput);

    const student = await Student.findById(studentId).lean<IStudent>();
    if (!student) throw new NotFoundError('Student');

    const useDirectVapi = aiService.isVapiActive();
    const provider = useDirectVapi || env.N8N_WEBHOOK_URL ? 'vapi' : 'mock';

    // 1. Create the communication record immediately so the UI has something to show
    const communication = await communicationRepository.create({
      studentId,
      type: 'call',
      status: 'PENDING',
      provider,
      direction: 'outbound',
      title: `AI Call — ${student.fatherName}`,
      summary: '',
      schoolId: ctx.schoolId,
      createdBy: ctx.displayName,
    });

    const commId = communication._id.toString();

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'comm.created',
      resource: 'communications',
      resourceId: commId,
      details: { type: 'call', studentId, provider },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    if (useDirectVapi) {
      // 2a. Direct Vapi path: AI Service manages the full call lifecycle
      aiService.initiateVoiceCall({
        commId,
        studentId,
        studentName: student.fullName,
        parentName: student.fatherName ?? '',
        parentPhone: student.parentPhone ?? '',
        className: student.class,
        staffName: ctx.displayName,
        triggeredBy: ctx.userId,
        schoolId: ctx.schoolId,
      }).catch((err) => {
        logger.error('Failed to initiate AI voice call via Vapi', { commId, err });
      });
    } else {
      // 2b. n8n/mock path: Automation service orchestrates via n8n (or mock simulation)
      automationService.dispatch({
        type: 'VOICE_CALL',
        payload: {
          communicationId: commId,
          studentId,
          studentName: student.fullName,
          parentName: student.fatherName,
          parentPhone: student.parentPhone,
          triggeredByName: ctx.displayName,
        },
        referenceId: commId,
        referenceType: 'communication',
        triggeredBy: ctx.userId,
        schoolId: ctx.schoolId,
        schoolName: env.SCHOOL_NAME,
      }).catch((err) => {
        logger.error('Failed to dispatch automation job for call', { commId, err });
      });
    }

    return communication;
  },

  /**
   * Legacy webhook handler — kept for backward compatibility with existing n8n workflows
   * that still call POST /communications/webhook.
   * New workflows should use POST /automation/webhook instead.
   */
  async handleWebhookCallback(rawInput: unknown): Promise<ICommunication> {
    const { communicationId, status, summary, recommendation, nextFollowUp, metadata } =
      webhookCallbackSchema.parse(rawInput);

    const updated = await communicationRepository.updateById(communicationId, {
      status,
      ...(summary !== undefined && { summary }),
      ...(recommendation !== undefined && { recommendation }),
      ...(nextFollowUp !== undefined && { nextFollowUp }),
      ...(metadata !== undefined && { metadata }),
    });

    if (!updated) throw new NotFoundError('Communication');

    logger.info('Legacy webhook callback processed', { communicationId, status });

    if (status === 'COMPLETED') {
      auditService.log({
        userId: 'system',
        userDisplayName: 'n8n Automation (legacy)',
        action: 'comm.completed',
        resource: 'communications',
        resourceId: communicationId,
        details: { status },
        schoolId: updated.schoolId,
      });
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      auditService.log({
        userId: 'system',
        userDisplayName: 'n8n Automation (legacy)',
        action: status === 'FAILED' ? 'comm.failed' : 'comm.cancelled',
        resource: 'communications',
        resourceId: communicationId,
        details: { status },
        schoolId: updated.schoolId,
      });
    }

    return updated;
  },

  async createNote(rawInput: unknown, ctx: AuthContext): Promise<ICommunication> {
    const { studentId, note } = createNoteSchema.parse(rawInput);

    const communication = await communicationRepository.create({
      studentId,
      type: 'note',
      status: 'COMPLETED',
      provider: 'mock',
      direction: 'outbound',
      title: 'Note',
      message: note,
      summary: note,
      schoolId: ctx.schoolId,
      createdBy: ctx.displayName,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'comm.created',
      resource: 'communications',
      resourceId: communication._id.toString(),
      details: { type: 'note', studentId },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return communication;
  },

  async sendWhatsApp(rawInput: unknown, ctx: AuthContext): Promise<ICommunication> {
    const { studentId, message } = sendWhatsAppSchema.parse(rawInput);

    const student = await Student.findById(studentId).lean<IStudent>();
    if (!student) throw new NotFoundError('Student');

    const useTwilio = isTwilioConfigured();
    const provider  = useTwilio ? 'twilio' : 'mock';

    const communication = await communicationRepository.create({
      studentId,
      type: 'whatsapp',
      // Twilio sends async — start as PENDING; mock completes instantly
      status: useTwilio ? 'PENDING' : 'COMPLETED',
      provider,
      direction: 'outbound',
      title: 'WhatsApp',
      message,
      summary: message,
      schoolId: ctx.schoolId,
      createdBy: ctx.displayName,
    });

    const commId = communication._id.toString();

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'comm.created',
      resource: 'communications',
      resourceId: commId,
      details: { type: 'whatsapp', studentId, provider },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    if (useTwilio) {
      twilioWhatsAppProvider.trigger({
        communicationId: commId,
        studentId,
        studentName: student.fullName,
        parentName: student.fatherName ?? '',
        parentPhone: student.parentPhone ?? '',
        schoolName: env.SCHOOL_NAME,
        type: 'whatsapp',
        message,
      });
    }

    return communication;
  },
};
