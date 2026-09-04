import mongoose, { Document, Schema } from 'mongoose';

// Not to be confused with apps/server/src/features/maintenance/ — that's the
// app's own maintenance-mode kill switch, unrelated. This is the real
// facility-ticket feature (AC/electrical/plumbing/furniture/computer repair).

// ── Enums ─────────────────────────────────────────────────────────────────────

export type FacilityIssueType = 'electrical' | 'plumbing' | 'furniture' | 'computer' | 'ac' | 'other';
export type FacilityRequestPriority = 'low' | 'medium' | 'high' | 'urgent';
export type FacilityRequestStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type FacilityAssignedToType = 'employee' | 'vendor';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IFacilityRequest extends Document {
  schoolId: string;

  ticketNo: string; // MT-{year}-{seq}

  // The requester's own identity — an Operations Manager or Accountant files
  // this themselves, unlike Purchase Request's raisedBy (a picked Employee).
  raisedBy: string;
  raisedByName: string;
  raisedByRole: string;

  issueType: FacilityIssueType;
  priority: FacilityRequestPriority;
  location: string;
  assetId?: string; // optional ref → Asset
  description?: string;

  assignedToType?: FacilityAssignedToType;
  assignedToId?: string;
  assignedToName?: string;

  status: FacilityRequestStatus;
  assignedAt?: Date;
  startedAt?: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;

  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const ISSUE_TYPES: FacilityIssueType[] = ['electrical', 'plumbing', 'furniture', 'computer', 'ac', 'other'];
const PRIORITIES: FacilityRequestPriority[] = ['low', 'medium', 'high', 'urgent'];
const STATUSES: FacilityRequestStatus[] = ['open', 'assigned', 'in_progress', 'completed', 'cancelled'];
const ASSIGNED_TO_TYPES: FacilityAssignedToType[] = ['employee', 'vendor'];

const facilityRequestSchema = new Schema<IFacilityRequest>(
  {
    schoolId: { type: String, required: true, default: 'DEMO_SCHOOL' },

    ticketNo: { type: String, required: true },

    raisedBy:     { type: String, required: true },
    raisedByName: { type: String, required: true, trim: true },
    raisedByRole: { type: String, required: true },

    issueType: { type: String, enum: ISSUE_TYPES, required: true },
    priority:  { type: String, enum: PRIORITIES, default: 'medium' },
    location:  { type: String, required: true, trim: true, maxlength: 200 },
    assetId:   { type: String },
    description: { type: String, trim: true, maxlength: 1000 },

    assignedToType: { type: String, enum: ASSIGNED_TO_TYPES },
    assignedToId:   { type: String },
    assignedToName: { type: String, trim: true },

    status:          { type: String, enum: STATUSES, default: 'open' },
    assignedAt:      { type: Date },
    startedAt:       { type: Date },
    resolvedAt:      { type: Date },
    resolutionNotes: { type: String, trim: true, maxlength: 1000 },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);

// ── Indexes ───────────────────────────────────────────────────────────────────

facilityRequestSchema.index({ schoolId: 1, ticketNo: 1 }, { unique: true });
facilityRequestSchema.index({ schoolId: 1, isDeleted: 1, status: 1, createdAt: -1 });
// "My tickets" — Accountant's own-only view.
facilityRequestSchema.index({ schoolId: 1, isDeleted: 1, raisedBy: 1, createdAt: -1 });

export const FacilityRequest = mongoose.model<IFacilityRequest>('FacilityRequest', facilityRequestSchema);
