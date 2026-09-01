import mongoose, { Document, Schema } from 'mongoose';

// ── Enums ─────────────────────────────────────────────────────────────────────

export type VisitorPurpose =
  | 'meet_student'
  | 'meet_staff'
  | 'admission_enquiry'
  | 'fee_payment'
  | 'delivery'
  | 'vendor'
  | 'interview'
  | 'other';

export type VisitorIdProofType =
  | 'aadhaar'
  | 'driving_license'
  | 'voter_id'
  | 'passport'
  | 'other';

// Reception Management Module SRD (docs/reception-management-module-srd.md),
// Module 1 — a visitor is now a real workflow, not just a check-in/out
// timestamp pair. Waiting → Approved → In Meeting → Completed, or Cancelled
// out of Waiting/Approved.
export type VisitorStatus =
  | 'waiting'
  | 'approved'
  | 'in_meeting'
  | 'completed'
  | 'cancelled';

// ── Document Interface ────────────────────────────────────────────────────────

export interface IVisitor extends Document {
  schoolId: string;
  // Visitor details
  name: string;
  contactNumber: string;
  photoUrl?: string;
  photoKey?: string; // R2 object key, kept for deletion — not exposed to clients
  idProofType?: VisitorIdProofType;
  idProofUrl?: string;
  idProofKey?: string;
  purpose: VisitorPurpose;
  purposeNote?: string;
  // Who they came to see — personToVisit stays as the display name (kept for
  // visitors logged before the staff-picker existed, and for anyone typed in
  // free-text as a fallback); personToVisitId links to a real Employee record
  // when picked from the directory, driving the "staff notified" flow.
  personToVisit: string;
  personToVisitId?: string;
  // Workflow status
  status: VisitorStatus;
  // Pass — generated when status moves to `approved`
  passNumber?: string;
  passIssuedAt?: Date;
  passValidUntil?: Date;
  // Pre-booked appointment this check-in fulfills, if any
  appointmentId?: string;
  // Visit window
  checkInTime: Date;
  checkOutTime?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  // Front-desk staff who logged the entry
  recordedById: string;
  recordedByName: string;
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const VISITOR_PURPOSES: VisitorPurpose[] = [
  'meet_student', 'meet_staff', 'admission_enquiry', 'fee_payment',
  'delivery', 'vendor', 'interview', 'other',
];

const VISITOR_ID_PROOF_TYPES: VisitorIdProofType[] = [
  'aadhaar', 'driving_license', 'voter_id', 'passport', 'other',
];

const VISITOR_STATUSES: VisitorStatus[] = [
  'waiting', 'approved', 'in_meeting', 'completed', 'cancelled',
];

const visitorSchema = new Schema<IVisitor>(
  {
    schoolId:         { type: String, required: true, index: true },
    name:             { type: String, required: true, trim: true, maxlength: 100 },
    contactNumber:    { type: String, required: true, trim: true },
    photoUrl:         { type: String },
    photoKey:         { type: String },
    idProofType:      { type: String, enum: VISITOR_ID_PROOF_TYPES },
    idProofUrl:       { type: String },
    idProofKey:       { type: String },
    purpose:          { type: String, enum: VISITOR_PURPOSES, required: true },
    purposeNote:      { type: String, trim: true, maxlength: 500 },
    personToVisit:    { type: String, required: true, trim: true, maxlength: 100 },
    personToVisitId:  { type: String },
    status:           { type: String, enum: VISITOR_STATUSES, required: true, default: 'waiting' },
    passNumber:       { type: String },
    passIssuedAt:     { type: Date },
    passValidUntil:   { type: Date },
    appointmentId:    { type: String },
    checkInTime:      { type: Date, required: true },
    checkOutTime:     { type: Date },
    cancelledAt:      { type: Date },
    cancelReason:     { type: String, trim: true, maxlength: 500 },
    recordedById:     { type: String, required: true },
    recordedByName:   { type: String, required: true },
    isDeleted:        { type: Boolean, default: false, index: true },
    deletedAt:        { type: Date },
    deletedBy:        { type: String },
  },
  { timestamps: true, versionKey: false }
);

// Primary query: today's visitor log for a school, most recent first
visitorSchema.index({ schoolId: 1, isDeleted: 1, checkInTime: -1 });
// Currently-on-campus visitors (no checkout yet)
visitorSchema.index({ schoolId: 1, isDeleted: 1, checkOutTime: 1 });
// Reception's "waiting" queue and status-filtered views
visitorSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
// Visitor history search by contact number (repeat vendors/parents)
visitorSchema.index({ schoolId: 1, contactNumber: 1 });

export const Visitor = mongoose.model<IVisitor>('Visitor', visitorSchema);
