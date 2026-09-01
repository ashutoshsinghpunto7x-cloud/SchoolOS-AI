import mongoose, { Document, Schema } from 'mongoose';

// Reception Management Module SRD (docs/reception-management-module-srd.md),
// Module 8 — a real task list for reception instead of sticky notes, with
// auto-generated tasks from other modules feeding the same list as
// hand-created ones (see `source` below).

export type ReceptionTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReceptionTaskStatus = 'open' | 'in_progress' | 'completed' | 'snoozed' | 'cancelled';
export type ReceptionTaskLinkedEntityType = 'enquiry' | 'admission_form' | 'candidate' | 'visitor' | 'none';
export type ReceptionTaskSource =
  | 'manual'
  | 'auto_form_overdue'
  | 'auto_followup_overdue'
  | 'auto_onboarding'
  | 'auto_visitor_wait';

export interface IReceptionTask extends Document {
  schoolId: string;
  title: string;
  description?: string;
  priority: ReceptionTaskPriority;
  dueDate: Date;
  assignedToId: string;
  assignedById: string;
  status: ReceptionTaskStatus;
  completedAt?: Date;
  completionNotes?: string;
  linkedEntityType: ReceptionTaskLinkedEntityType;
  linkedEntityId?: string;
  source: ReceptionTaskSource;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PRIORITIES: ReceptionTaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const STATUSES: ReceptionTaskStatus[] = ['open', 'in_progress', 'completed', 'snoozed', 'cancelled'];
const LINKED_ENTITY_TYPES: ReceptionTaskLinkedEntityType[] = ['enquiry', 'admission_form', 'candidate', 'visitor', 'none'];
const SOURCES: ReceptionTaskSource[] = [
  'manual', 'auto_form_overdue', 'auto_followup_overdue', 'auto_onboarding', 'auto_visitor_wait',
];

const receptionTaskSchema = new Schema<IReceptionTask>(
  {
    schoolId:         { type: String, required: true, index: true },
    title:            { type: String, required: true, trim: true, maxlength: 200 },
    description:      { type: String, trim: true, maxlength: 1000 },
    priority:         { type: String, enum: PRIORITIES, required: true, default: 'medium' },
    dueDate:          { type: Date, required: true },
    assignedToId:     { type: String, required: true },
    assignedById:     { type: String, required: true },
    status:           { type: String, enum: STATUSES, required: true, default: 'open' },
    completedAt:      { type: Date },
    completionNotes:  { type: String, trim: true, maxlength: 1000 },
    linkedEntityType: { type: String, enum: LINKED_ENTITY_TYPES, required: true, default: 'none' },
    linkedEntityId:   { type: String },
    source:           { type: String, enum: SOURCES, required: true, default: 'manual' },
    isDeleted:        { type: Boolean, default: false, index: true },
    deletedAt:        { type: Date },
    deletedBy:        { type: String },
  },
  { timestamps: true, versionKey: false }
);

// "My Tasks" — a person's own open/overdue tasks, soonest due first
receptionTaskSchema.index({ schoolId: 1, isDeleted: 1, assignedToId: 1, status: 1, dueDate: 1 });
// Everyone's tasks (principal/admin oversight view)
receptionTaskSchema.index({ schoolId: 1, isDeleted: 1, status: 1, dueDate: 1 });
// Prevents an auto-generated task from being recreated every cron tick for
// the same still-open source record (see reception-task-auto.job.ts).
receptionTaskSchema.index({ schoolId: 1, linkedEntityType: 1, linkedEntityId: 1, source: 1 });

export const ReceptionTask = mongoose.model<IReceptionTask>('ReceptionTask', receptionTaskSchema);
