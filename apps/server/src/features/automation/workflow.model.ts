import mongoose, { Document, Schema } from 'mongoose';
import { WorkflowId } from '@schoolos/types';

export interface IWorkflowConfig {
  enabled: boolean;
  delayMinutes: number;
  retryCount: number;
  retryIntervalMinutes: number;
  channels: string[];
}

export interface IWorkflow extends Document {
  workflowId: WorkflowId;
  schoolId: string;
  config: IWorkflowConfig;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const workflowConfigSchema = new Schema<IWorkflowConfig>(
  {
    enabled: { type: Boolean, required: true, default: false },
    delayMinutes: { type: Number, required: true, default: 0 },
    retryCount: { type: Number, required: true, default: 0 },
    retryIntervalMinutes: { type: Number, required: true, default: 0 },
    channels: { type: [String], required: true, default: [] },
  },
  { _id: false }
);

const workflowSchema = new Schema<IWorkflow>(
  {
    workflowId: {
      type: String,
      enum: ['WF-001', 'WF-002', 'WF-003', 'WF-004', 'WF-005', 'WF-006', 'WF-007', 'WF-008'],
      required: true,
    },
    schoolId: { type: String, required: true },
    config: { type: workflowConfigSchema, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

workflowSchema.index({ schoolId: 1, workflowId: 1 }, { unique: true });

export const Workflow = mongoose.model<IWorkflow>('Workflow', workflowSchema);
