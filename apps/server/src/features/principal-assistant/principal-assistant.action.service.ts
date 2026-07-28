import { classifyAction, extractActionParams, UNSUPPORTED_ACTION, ActionPreview } from './action-registry';
import { meetingAction } from './actions/meeting.action';
import { previewActionSchema, executeActionSchema } from './principal-assistant.action.validation';
import { recordUsage } from './intent-router';
import { AuthContext } from '../../lib/auth-context';
import { hasPermission } from '../../lib/permissions';
import { AppError, ForbiddenError, ValidationError } from '../../middlewares/errorHandler';
import { auditService } from '../audit/audit.service';
import { logger } from '../../lib/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actionRegistry: import('./action-registry').ActionDefinition<any, any, any>[] = [meetingAction];

function findAction(actionId: string) {
  const action = actionRegistry.find((a) => a.id === actionId);
  if (!action) throw new ValidationError(`Unknown action id: ${actionId}`);
  return action;
}

export interface ActionPreviewResult {
  actionId: string;
  params: Record<string, unknown>;
  preview: ActionPreview;
}

export interface ActionExecuteResult {
  actionId: string;
  summary: string;
  notifiedCount?: number;
}

export const principalAssistantActionService = {
  /**
   * Returns null when the message doesn't match any registered action — the
   * caller (principal-assistant.service.ts) then falls back to the read-only
   * Q&A intent flow. Never mutates.
   */
  async previewFromMessage(message: string, ctx: AuthContext): Promise<ActionPreviewResult | null> {
    const { actionId, usage: classifyUsage } = await classifyAction(message, actionRegistry);
    recordUsage(classifyUsage, ctx.schoolId);

    if (actionId === UNSUPPORTED_ACTION) return null;

    const action = findAction(actionId);

    if (!hasPermission(ctx.role as Parameters<typeof hasPermission>[0], action.requiredPermission)) {
      throw new ForbiddenError(`Required permission: ${action.requiredPermission}`);
    }

    const { params, usage: extractUsage } = await extractActionParams(message, action);
    recordUsage(extractUsage, ctx.schoolId);

    const previewData = await action.buildPreview(ctx, params);
    const preview = action.describePreview(previewData, params);

    auditService.log({
      userId: ctx.userId,
      userDisplayName: ctx.displayName,
      action: 'ai_action.previewed',
      resource: 'principal-assistant-action',
      resourceId: action.id,
      details: { params },
      ip: ctx.ip,
      schoolId: ctx.schoolId,
    });

    return { actionId: action.id, params: params as Record<string, unknown>, preview };
  },

  /** Re-runs buildPreview after the Principal edits a field — still never mutates. */
  async preview(rawInput: unknown, ctx: AuthContext): Promise<ActionPreviewResult> {
    const input = previewActionSchema.parse(rawInput);

    if ('message' in input) {
      const result = await principalAssistantActionService.previewFromMessage(input.message, ctx);
      if (!result) {
        throw new AppError(
          "That doesn't match anything I can do yet. Try rephrasing, or ask a question instead.",
          422,
          'ACTION_UNSUPPORTED',
        );
      }
      return result;
    }

    const action = findAction(input.actionId);

    if (!hasPermission(ctx.role as Parameters<typeof hasPermission>[0], action.requiredPermission)) {
      throw new ForbiddenError(`Required permission: ${action.requiredPermission}`);
    }

    const params = action.paramsSchema.parse(input.params);
    const previewData = await action.buildPreview(ctx, params);
    const preview = action.describePreview(previewData, params);

    return { actionId: action.id, params: params as Record<string, unknown>, preview };
  },

  async execute(rawInput: unknown, ctx: AuthContext): Promise<ActionExecuteResult> {
    const input = executeActionSchema.parse(rawInput);
    const action = findAction(input.actionId);

    if (!hasPermission(ctx.role as Parameters<typeof hasPermission>[0], action.requiredPermission)) {
      throw new ForbiddenError(`Required permission: ${action.requiredPermission}`);
    }

    // Never trust the client's params as-is — re-validate against the same
    // schema used for preview, even if this call never went through /preview.
    const params = action.paramsSchema.parse(input.params);

    try {
      const result = await action.execute(ctx, params);
      const { summary, notifiedCount } = action.describeResult(result);

      auditService.log({
        userId: ctx.userId,
        userDisplayName: ctx.displayName,
        action: 'ai_action.executed',
        resource: 'principal-assistant-action',
        resourceId: action.id,
        details: { params, summary },
        ip: ctx.ip,
        schoolId: ctx.schoolId,
      });

      return { actionId: action.id, summary, notifiedCount };
    } catch (err) {
      logger.error('[PrincipalAssistantAction] Execute failed', { actionId: action.id, schoolId: ctx.schoolId, err });
      auditService.log({
        userId: ctx.userId,
        userDisplayName: ctx.displayName,
        action: 'ai_action.failed',
        resource: 'principal-assistant-action',
        resourceId: action.id,
        details: { params, error: (err as Error).message },
        ip: ctx.ip,
        schoolId: ctx.schoolId,
      });
      throw err;
    }
  },
};
