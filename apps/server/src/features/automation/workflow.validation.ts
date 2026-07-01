import { z } from 'zod';

export const WORKFLOW_IDS = ['WF-001', 'WF-002', 'WF-003', 'WF-004', 'WF-005', 'WF-006', 'WF-007', 'WF-008'] as const;

export const updateWorkflowConfigSchema = z.object({
  enabled: z.boolean().optional(),
  delayMinutes: z.number().int().min(0).max(10080).optional(),
  retryCount: z.number().int().min(0).max(5).optional(),
  retryIntervalMinutes: z.number().int().min(0).max(10080).optional(),
  channels: z.array(z.string().min(1)).max(5).optional(),
});

export const triggerWorkflowSchema = z.object({
  workflowId: z.enum(WORKFLOW_IDS),
  payload: z.record(z.unknown()).default({}),
});

export type UpdateWorkflowConfigInput = z.infer<typeof updateWorkflowConfigSchema>;
export type TriggerWorkflowInput = z.infer<typeof triggerWorkflowSchema>;
