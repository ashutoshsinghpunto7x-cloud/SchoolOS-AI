import { automationRepository, PaginatedJobs, FindJobsOptions } from './automation.repository';
import { listJobsSchema, webhookCallbackSchema } from './automation.validation';
import { AutomationJob, IAutomationJob, AutomationJobType, AutomationProviderName } from './automation.model';
import { IAutomationProvider } from './providers/automation-provider.interface';
import { n8nAutomationProvider } from './providers/n8n-automation.provider';
import { mockAutomationProvider } from './providers/mock-automation.provider';
import { Communication } from '../communications/communication.model';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

// ── Provider registry ─────────────────────────────────────────────────────────

const PROVIDERS: IAutomationProvider[] = [n8nAutomationProvider, mockAutomationProvider];

/**
 * Selects the active automation provider based on environment and job type.
 * N8N is the production provider when N8N_WEBHOOK_URL is configured.
 * Mock provider is used in development.
 */
const selectProvider = (type: AutomationJobType): IAutomationProvider => {
  if (env.N8N_WEBHOOK_URL) return n8nAutomationProvider;
  const mock = PROVIDERS.find((p) => p.name === 'mock' && p.supports(type));
  return mock ?? n8nAutomationProvider; // fallback — n8n will log a warning if URL missing
};

const resolveProviderName = (): AutomationProviderName =>
  env.N8N_WEBHOOK_URL ? 'n8n' : 'mock';

// ── Dispatch input ────────────────────────────────────────────────────────────

export interface DispatchInput {
  type: AutomationJobType;
  payload: Record<string, unknown>;
  workflowId?: string;
  referenceId?: string;
  referenceType?: IAutomationJob['referenceType'];
  triggeredBy: string;
  schoolId: string;
  schoolName?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const automationService = {
  /**
   * Primary entry point for all business modules.
   * Creates an AutomationJob and fires the selected provider.
   * Returns immediately — completion arrives via webhook.
   */
  async dispatch(input: DispatchInput): Promise<IAutomationJob> {
    const providerName = resolveProviderName();

    const job = await automationRepository.create({
      type: input.type,
      provider: providerName,
      payload: input.payload,
      workflowId: input.workflowId,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      triggeredBy: input.triggeredBy,
      schoolId: input.schoolId,
    });

    const jobId = job._id.toString();

    auditService.log({
      userId: input.triggeredBy,
      userDisplayName: String(input.payload.triggeredByName ?? input.triggeredBy),
      action: 'automation.job_created',
      resource: 'automation_jobs',
      resourceId: jobId,
      details: { type: input.type, provider: providerName, referenceId: input.referenceId },
      schoolId: input.schoolId,
    });

    const provider = selectProvider(input.type);

    provider.dispatch(
      {
        jobId,
        type: input.type,
        payload: input.payload,
        schoolName: input.schoolName ?? env.SCHOOL_NAME,
      },
      job
    );

    logger.info('Automation job dispatched', { jobId, type: input.type, provider: providerName });

    return job;
  },

  async list(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedJobs> {
    const opts = listJobsSchema.parse(rawQuery);
    const options: FindJobsOptions = {
      page: opts.page,
      limit: opts.limit,
      search: opts.search,
      type: opts.type,
      status: opts.status,
      sortOrder: opts.sortOrder,
    };
    return automationRepository.findAll(ctx.schoolId, options);
  },

  async getById(id: string, ctx: AuthContext): Promise<IAutomationJob> {
    const job = await automationRepository.findById(id, ctx.schoolId);
    if (!job) throw new NotFoundError('Automation job');
    return job;
  },

  async cancel(id: string, ctx: AuthContext): Promise<IAutomationJob> {
    const job = await automationRepository.findById(id, ctx.schoolId);
    if (!job) throw new NotFoundError('Automation job');

    const cancellable: IAutomationJob['status'][] = ['QUEUED', 'RUNNING', 'RETRYING'];
    if (!cancellable.includes(job.status)) {
      throw new ValidationError(`Cannot cancel a job with status ${job.status}`);
    }

    const updated = await automationRepository.updateById(id, { status: 'CANCELLED' });
    if (!updated) throw new NotFoundError('Automation job');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'automation.job_cancelled',
      resource: 'automation_jobs',
      resourceId: id,
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return updated;
  },

  async retry(id: string, ctx: AuthContext): Promise<IAutomationJob> {
    const job = await automationRepository.findById(id, ctx.schoolId);
    if (!job) throw new NotFoundError('Automation job');

    const retryable: IAutomationJob['status'][] = ['FAILED', 'CANCELLED'];
    if (!retryable.includes(job.status)) {
      throw new ValidationError(`Cannot retry a job with status ${job.status}`);
    }

    const updated = await automationRepository.updateById(id, {
      status: 'RETRYING',
      retryCount: job.retryCount + 1,
      startedAt: undefined,
      completedAt: undefined,
      failedAt: undefined,
      errorMessage: undefined,
    });
    if (!updated) throw new NotFoundError('Automation job');

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'automation.job_retried',
      resource: 'automation_jobs',
      resourceId: id,
      details: { retryCount: updated.retryCount },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    const provider = selectProvider(job.type);
    provider.dispatch(
      {
        jobId: id,
        type: job.type,
        payload: job.payload,
        schoolName: env.SCHOOL_NAME,
      },
      updated
    );

    return updated;
  },

  async handleWebhook(rawInput: unknown, secret?: string): Promise<IAutomationJob> {
    // Validate webhook secret when configured
    if (env.AUTOMATION_WEBHOOK_SECRET) {
      if (!secret || secret !== env.AUTOMATION_WEBHOOK_SECRET) {
        throw new ValidationError('Invalid webhook secret');
      }
    }

    const { jobId, status, result, errorMessage } = webhookCallbackSchema.parse(rawInput);

    const job = await AutomationJob.findById(jobId);
    if (!job) throw new NotFoundError('Automation job');

    const now = new Date();
    const updateData: Record<string, unknown> = { status };

    if (status === 'RUNNING') updateData.startedAt = now;
    if (status === 'COMPLETED') { updateData.completedAt = now; updateData.result = result; }
    if (status === 'FAILED') { updateData.failedAt = now; updateData.errorMessage = errorMessage; }

    const updated = await automationRepository.updateById(jobId, updateData as Parameters<typeof automationRepository.updateById>[1]);
    if (!updated) throw new NotFoundError('Automation job');

    logger.info('Automation webhook processed', { jobId, status });

    // If the job references a Communication, propagate status + result there too
    if (job.referenceType === 'communication' && job.referenceId) {
      await automationService.propagateToCommunication(job.referenceId, status, result);
    }

    // Audit
    const auditAction =
      status === 'COMPLETED' ? 'automation.job_completed'
      : status === 'FAILED' ? 'automation.job_failed'
      : 'automation.webhook_received';

    auditService.log({
      userId: 'system',
      userDisplayName: 'n8n Automation',
      action: auditAction,
      resource: 'automation_jobs',
      resourceId: jobId,
      details: { status, hasResult: Boolean(result) },
      schoolId: job.schoolId,
    });

    return updated;
  },

  /** Propagates a terminal automation result back to the linked Communication document. */
  async propagateToCommunication(
    communicationId: string,
    status: string,
    result?: Record<string, unknown>
  ): Promise<void> {
    try {
      const commStatus = status === 'COMPLETED' ? 'COMPLETED'
        : status === 'FAILED' ? 'FAILED'
        : status === 'CANCELLED' ? 'CANCELLED'
        : undefined;

      if (!commStatus) return;

      const update: Record<string, unknown> = { status: commStatus };
      if (result) {
        if (result.summary) update.summary = result.summary;
        if (result.recommendation) update.recommendation = result.recommendation;
        if (result.nextFollowUp) update.nextFollowUp = result.nextFollowUp;
      }

      await Communication.findByIdAndUpdate(communicationId, { $set: update });
      logger.info('Communication updated from automation webhook', { communicationId, status });
    } catch (err) {
      logger.error('Failed to propagate automation result to communication', {
        communicationId,
        err,
      });
    }
  },
};
