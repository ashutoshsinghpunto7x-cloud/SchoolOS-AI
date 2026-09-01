import mongoose, { Document, Schema } from 'mongoose';

// Reception Management Module SRD (docs/reception-management-module-srd.md),
// Module 4 — a lightweight join model rather than duplicating fields already
// on `Enquiry`. `Enquiry.followUpDate` stays as "the next follow-up date"
// denormalized onto the lead for quick sorting in the pipeline view (see
// follow-up.service.ts, which keeps that field in sync); FollowUp records
// are the append-only history of every attempt, completed or missed.

export type FollowUpChannel = 'call' | 'whatsapp' | 'email' | 'in_person';
export type FollowUpStatus = 'pending' | 'completed' | 'missed' | 'rescheduled';

export interface IFollowUp extends Document {
  schoolId: string;
  enquiryId: string;
  dueDate: Date;
  assignedToId: string;
  channel: FollowUpChannel;
  status: FollowUpStatus;
  outcome?: string;
  completedAt?: Date;
  nextFollowUpDate?: Date;
  // Internal — not in the SRD's field table, but needed so the missed-
  // follow-up escalation (Module 4 "Notifications") fires once per record,
  // not on every cron tick after the 2-day threshold passes.
  escalatedAt?: Date;
  createdBy: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CHANNELS: FollowUpChannel[] = ['call', 'whatsapp', 'email', 'in_person'];
const STATUSES: FollowUpStatus[] = ['pending', 'completed', 'missed', 'rescheduled'];

const followUpSchema = new Schema<IFollowUp>(
  {
    schoolId:         { type: String, required: true, index: true },
    enquiryId:        { type: String, required: true },
    dueDate:          { type: Date, required: true },
    assignedToId:     { type: String, required: true },
    channel:          { type: String, enum: CHANNELS, required: true },
    status:           { type: String, enum: STATUSES, required: true, default: 'pending' },
    outcome:          { type: String, trim: true, maxlength: 1000 },
    completedAt:      { type: Date },
    nextFollowUpDate: { type: Date },
    escalatedAt:      { type: Date },
    createdBy:        { type: String, required: true },
    isDeleted:        { type: Boolean, default: false, index: true },
    deletedAt:        { type: Date },
    deletedBy:        { type: String },
  },
  { timestamps: true, versionKey: false }
);

// "Due Today" / "Overdue" dashboard — everyone's pending follow-ups, soonest first
followUpSchema.index({ schoolId: 1, isDeleted: 1, status: 1, dueDate: 1 });
// A counselor's own follow-ups
followUpSchema.index({ schoolId: 1, isDeleted: 1, assignedToId: 1, status: 1, dueDate: 1 });
// Full history for one lead, most recent first
followUpSchema.index({ enquiryId: 1, isDeleted: 1, createdAt: -1 });

export const FollowUp = mongoose.model<IFollowUp>('FollowUp', followUpSchema);
