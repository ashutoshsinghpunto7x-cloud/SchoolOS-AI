import { WorkflowId } from '@schoolos/types';
import { IWorkflow, IWorkflowConfig, Workflow } from './workflow.model';

export const workflowRepository = {
  async findBySchool(schoolId: string): Promise<IWorkflow[]> {
    return Workflow.find({ schoolId }).lean<IWorkflow[]>();
  },

  async findOne(schoolId: string, workflowId: WorkflowId): Promise<IWorkflow | null> {
    return Workflow.findOne({ schoolId, workflowId }).lean<IWorkflow>();
  },

  async upsert(
    schoolId: string,
    workflowId: WorkflowId,
    config: IWorkflowConfig,
    createdBy: string
  ): Promise<IWorkflow> {
    const doc = await Workflow.findOneAndUpdate(
      { schoolId, workflowId },
      { $set: { config, createdBy } },
      { new: true, upsert: true, runValidators: true }
    ).lean<IWorkflow>();
    return doc!;
  },

  async updateConfig(
    schoolId: string,
    workflowId: WorkflowId,
    patch: Partial<IWorkflowConfig>
  ): Promise<IWorkflow | null> {
    const setFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) {
      setFields[`config.${k}`] = v;
    }
    return Workflow.findOneAndUpdate(
      { schoolId, workflowId },
      { $set: setFields },
      { new: true, runValidators: true }
    ).lean<IWorkflow>();
  },
};
