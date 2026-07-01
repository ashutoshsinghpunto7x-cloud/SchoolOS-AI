import { WorkflowId } from '@schoolos/types';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { automationRepository } from './automation.repository';
import { automationService } from './automation.service';
import { WORKFLOW_DEFINITIONS, getWorkflowDefinition } from './workflows/definitions';
import { workflowRepository } from './workflow.repository';
import { IWorkflow, IWorkflowConfig } from './workflow.model';
import { updateWorkflowConfigSchema, triggerWorkflowSchema } from './workflow.validation';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Merges a school's saved config with the static definition's defaults. */
const resolveConfig = (defId: WorkflowId, saved: IWorkflow | null): IWorkflowConfig => {
  const def = getWorkflowDefinition(defId)!;
  if (!saved) return { ...def.defaultConfig };
  return saved.config;
};

// ── Service ───────────────────────────────────────────────────────────────────

export const workflowService = {
  /** Returns all 8 workflow definitions merged with per-school saved config. */
  async listAll(ctx: AuthContext) {
    const saved = await workflowRepository.findBySchool(ctx.schoolId);
    const savedMap = new Map(saved.map((s) => [s.workflowId, s]));

    return WORKFLOW_DEFINITIONS.map((def) => {
      const doc = savedMap.get(def.id) ?? null;
      return {
        ...def,
        config: resolveConfig(def.id, doc),
        savedAt: doc?.updatedAt ?? null,
      };
    });
  },

  /** Returns a single workflow definition + config. */
  async getOne(workflowId: WorkflowId, ctx: AuthContext) {
    const def = getWorkflowDefinition(workflowId);
    if (!def) throw new NotFoundError('Workflow');
    const saved = await workflowRepository.findOne(ctx.schoolId, workflowId);
    return {
      ...def,
      config: resolveConfig(workflowId, saved),
      savedAt: saved?.updatedAt ?? null,
    };
  },

  /** Partially updates the per-school config for a workflow. */
  async updateConfig(workflowId: WorkflowId, rawBody: unknown, ctx: AuthContext) {
    const def = getWorkflowDefinition(workflowId);
    if (!def) throw new NotFoundError('Workflow');

    const patch = updateWorkflowConfigSchema.parse(rawBody);

    // Only allow updating fields listed in def.configurable
    const blocked = (Object.keys(patch) as Array<keyof typeof patch>).filter(
      (k) => !def.configurable.includes(k as never)
    );
    if (blocked.length > 0) {
      throw new ValidationError(`Fields not configurable for ${workflowId}: ${blocked.join(', ')}`);
    }

    const existing = await workflowRepository.findOne(ctx.schoolId, workflowId);
    const baseConfig = existing?.config ?? { ...def.defaultConfig };

    const updated = await workflowRepository.upsert(
      ctx.schoolId,
      workflowId,
      { ...baseConfig, ...patch },
      ctx.userId
    );

    const action = patch.enabled === true ? 'workflow.enabled' : patch.enabled === false ? 'workflow.disabled' : 'workflow.updated';
    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action,
      resource: 'workflows',
      resourceId: workflowId,
      details: { patch },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return { ...def, config: updated.config, savedAt: updated.updatedAt };
  },

  /** Dispatches a workflow by creating an AutomationJob and firing n8n. */
  async trigger(rawBody: unknown, ctx: AuthContext) {
    const { workflowId, payload } = triggerWorkflowSchema.parse(rawBody);

    const def = getWorkflowDefinition(workflowId);
    if (!def) throw new NotFoundError('Workflow');

    const saved = await workflowRepository.findOne(ctx.schoolId, workflowId);
    const config = resolveConfig(workflowId, saved);

    if (!config.enabled) {
      throw new ValidationError(`Workflow ${workflowId} is not enabled. Enable it first.`);
    }

    const job = await automationService.dispatch({
      type: def.jobType,
      payload: { ...payload, triggeredByName: ctx.displayName },
      workflowId,
      triggeredBy: ctx.userId,
      schoolId: ctx.schoolId,
    });

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'workflow.triggered',
      resource: 'workflows',
      resourceId: workflowId,
      details: { jobId: job._id.toString(), jobType: def.jobType },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return { workflowId, jobId: job._id.toString(), status: job.status };
  },

  /** Returns execution stats for a single workflow. */
  async getStats(workflowId: WorkflowId, ctx: AuthContext) {
    const def = getWorkflowDefinition(workflowId);
    if (!def) throw new NotFoundError('Workflow');
    return automationRepository.getWorkflowStats(workflowId, ctx.schoolId);
  },

  /** Returns dashboard-level metrics across all workflows. */
  async getDashboardMetrics(ctx: AuthContext) {
    return automationRepository.getDashboardMetrics(ctx.schoolId);
  },
};
